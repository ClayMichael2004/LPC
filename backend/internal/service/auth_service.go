package service

import (
	"context"
	"crypto/rand"
	"errors"
	"fmt"
	"log"
	"math/big"
	"strings"
	"sync"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"github.com/littlepolocafe/backend/internal/config"
	"github.com/littlepolocafe/backend/internal/domain"
	"github.com/littlepolocafe/backend/internal/repository/postgres"
	redisclient "github.com/redis/go-redis/v9"
	"golang.org/x/crypto/bcrypt"
)

const OTPExpiryDuration = 5 * time.Minute

var (
	ErrInvalidOTP         = errors.New("invalid or expired OTP code")
	ErrExpiredOTP         = errors.New("OTP code has expired (valid for 5 minutes)")
	ErrAccountNotFound    = errors.New("no registered account found with this email address")
	ErrInvalidAdminAuth   = errors.New("invalid admin email or password")
	ErrInvalidCredentials = errors.New("invalid email/phone or password")
	ErrUserAlreadyExists  = errors.New("an account with this email or phone already exists")
)

type UserStore interface {
	Create(ctx context.Context, u *domain.User) error
	GetByID(ctx context.Context, id string) (*domain.User, error)
	GetByPhone(ctx context.Context, phone string) (*domain.User, error)
	GetByEmail(ctx context.Context, email string) (*domain.User, error)
	Update(ctx context.Context, u *domain.User) error
	GetAll(ctx context.Context) ([]*domain.User, error)
}

type AuthService struct {
	cfg               *config.Config
	userRepo          UserStore
	emailService      *EmailService
	redisClient       *redisclient.Client
	localOTP          sync.Map // Fallback in-memory OTP store
	activeSessions    sync.Map // userID -> active sessionID (single-device session enforcement)
	onNewRegistration func(u *domain.User)
}

type otpItem struct {
	code      string
	expiresAt time.Time
}

func NewAuthService(
	cfg *config.Config,
	userRepo UserStore,
	emailService *EmailService,
	redisClient *redisclient.Client,
) *AuthService {
	return &AuthService{
		cfg:          cfg,
		userRepo:     userRepo,
		emailService: emailService,
		redisClient:  redisClient,
	}
}

func normalizeOTPIdentifier(identifier string) string {
	identifier = strings.TrimSpace(identifier)
	if strings.Contains(identifier, "@") {
		return strings.ToLower(identifier)
	}
	return identifier
}

// RequestOTP verifies the account is registered, generates a 4-digit code with 5 min TTL, and dispatches via Email or WhatsApp.
func (s *AuthService) RequestOTP(ctx context.Context, otpType, identifier string) (string, error) {
	identifier = normalizeOTPIdentifier(identifier)

	// Confirm the email or phone number is registered before sending an OTP
	var user *domain.User
	var lookupErr error
	if strings.Contains(identifier, "@") {
		user, lookupErr = s.userRepo.GetByEmail(ctx, identifier)
	} else {
		user, lookupErr = s.userRepo.GetByPhone(ctx, identifier)
	}
	if errors.Is(lookupErr, postgres.ErrUserNotFound) || user == nil {
		return "", ErrAccountNotFound
	}

	code, err := generate4DigitCode()
	if err != nil {
		return "", fmt.Errorf("failed to generate OTP: %w", err)
	}

	ttl := OTPExpiryDuration
	expiresAt := time.Now().Add(ttl)
	redisKey := fmt.Sprintf("lpc:otp:%s", identifier)

	// Always store with explicit 5-minute expiration timestamp in localOTP so we can detect expired codes
	s.localOTP.Store(identifier, otpItem{code: code, expiresAt: expiresAt})

	if s.redisClient != nil {
		if err := s.redisClient.Set(ctx, redisKey, code, ttl).Err(); err != nil {
			log.Printf("[Redis Warning] Failed to store OTP in Redis: %v. Using in-memory 5m TTL store.", err)
		}
	}

	if otpType == "email" {
		targetEmail := user.Email
		if targetEmail == "" {
			targetEmail = identifier
		}
		if err := s.emailService.SendOTP(targetEmail, code); err != nil {
			return "", err
		}
	} else {
		// WhatsApp / Phone OTP dispatch (ready for Africa's Talking WhatsApp integration)
		targetPhone := user.Phone
		if targetPhone == "" {
			targetPhone = identifier
		}
		log.Printf("==================================================================")
		log.Printf("[WHATSAPP OTP DISPATCH] To WhatsApp: %s (Expires in 5 minutes)", targetPhone)
		log.Printf("[WHATSAPP OTP CODE]     >>> %s <<<", code)
		log.Printf("==================================================================")
	}

	return code, nil
}

// ExpireOTPForTest artificially backdates an OTP's expiration timestamp for testing the 5-minute expiry window.
func (s *AuthService) ExpireOTPForTest(ctx context.Context, identifier string) {
	identifier = normalizeOTPIdentifier(identifier)
	if item, ok := s.localOTP.Load(identifier); ok {
		stored := item.(otpItem)
		stored.expiresAt = time.Now().Add(-1 * time.Second)
		s.localOTP.Store(identifier, stored)
	}
	if s.redisClient != nil {
		_ = s.redisClient.Del(ctx, fmt.Sprintf("lpc:otp:%s", identifier)).Err()
	}
}

// VerifyOTP checks the submitted code (strictly within the 5-minute validity window), creates or gets the customer, and returns a JWT.
func (s *AuthService) VerifyOTP(ctx context.Context, identifier, code, name string) (*domain.AuthResponse, error) {
	identifier = normalizeOTPIdentifier(identifier)
	code = strings.TrimSpace(code)

	var validCode string
	var isExpired bool
	redisKey := fmt.Sprintf("lpc:otp:%s", identifier)

	// Check local 5-minute expiration tracker first
	if item, ok := s.localOTP.Load(identifier); ok {
		stored := item.(otpItem)
		if time.Now().Before(stored.expiresAt) {
			validCode = stored.code
		} else {
			isExpired = true
			s.localOTP.Delete(identifier)
			if s.redisClient != nil {
				_ = s.redisClient.Del(ctx, redisKey).Err()
			}
		}
	}

	// Fallback to Redis if not in local memory and not already flagged expired
	if validCode == "" && !isExpired && s.redisClient != nil {
		val, err := s.redisClient.Get(ctx, redisKey).Result()
		if err == nil {
			validCode = val
		}
	}

	if isExpired {
		return nil, ErrExpiredOTP
	}

	// Only allow "1234" in unit test environment
	isTestBypass := s.cfg.Env == "test" && code == "1234"

	if validCode == "" || (validCode != code && !isTestBypass) {
		if !isTestBypass {
			return nil, ErrInvalidOTP
		}
	}

	// Delete used OTP immediately (single-use within 5 minutes)
	if s.redisClient != nil {
		_ = s.redisClient.Del(ctx, redisKey).Err()
	}
	s.localOTP.Delete(identifier)

	// Fetch or create user
	var user *domain.User
	var err error
	isEmail := strings.Contains(identifier, "@")

	if isEmail {
		user, err = s.userRepo.GetByEmail(ctx, identifier)
	} else {
		user, err = s.userRepo.GetByPhone(ctx, identifier)
	}

	isAdmin := strings.EqualFold(identifier, s.cfg.AdminEmail) || identifier == "+254704769219" || (user != nil && user.Role == domain.RoleAdmin)

	if isAdmin {
		if user == nil {
			user, _ = s.userRepo.GetByEmail(ctx, s.cfg.AdminEmail)
		}
		if user == nil {
			user = &domain.User{
				ID:       "usr-admin",
				Name:     "Cafe Administrator",
				Initials: "CA",
				Email:    s.cfg.AdminEmail,
				Phone:    "+254704769219",
				Role:     domain.RoleAdmin,
			}
			_ = s.userRepo.Create(ctx, user)
		} else if user.Role != domain.RoleAdmin {
			user.Role = domain.RoleAdmin
			_ = s.userRepo.Update(ctx, user)
		}
	} else if errors.Is(err, postgres.ErrUserNotFound) || user == nil {
		userName := name
		if userName == "" {
			if isEmail {
				parts := strings.Split(identifier, "@")
				userName = strings.Title(parts[0])
			} else {
				userName = "Little Polo Guest"
			}
		}

		user = &domain.User{
			ID:       uuid.NewString(),
			Name:     userName,
			Initials: computeInitials(userName),
			Role:     domain.RoleCustomer,
		}

		if isEmail {
			user.Email = identifier
			user.Phone = "+254 " + strings.TrimPrefix(identifier, "+254")
		} else {
			user.Phone = identifier
			user.Email = ""
		}

		if err := s.userRepo.Create(ctx, user); err != nil {
			return nil, fmt.Errorf("failed to register user: %w", err)
		}
	}

	token, exp, err := s.generateJWT(user)
	if err != nil {
		return nil, fmt.Errorf("failed to generate token: %w", err)
	}

	return &domain.AuthResponse{
		Token:     token,
		TokenType: "Bearer",
		ExpiresIn: exp,
		User:      *user,
	}, nil
}

// AdminLogin authenticates the cafe owner administrator.
func (s *AuthService) AdminLogin(ctx context.Context, email, password string) (*domain.AuthResponse, error) {
	email = strings.TrimSpace(email)
	if email != s.cfg.AdminEmail || password != s.cfg.AdminPassword {
		return nil, ErrInvalidAdminAuth
	}

	user, err := s.userRepo.GetByEmail(ctx, email)
	if errors.Is(err, postgres.ErrUserNotFound) || user == nil {
		user = &domain.User{
			ID:       uuid.NewString(),
			Name:     "Cafe Administrator",
			Initials: "CA",
			Email:    email,
			Phone:    "+254704769219",
			Role:     domain.RoleAdmin,
		}
		if err := s.userRepo.Create(ctx, user); err != nil {
			return nil, fmt.Errorf("failed to create admin record: %w", err)
		}
	} else if user.Role != domain.RoleAdmin {
		user.Role = domain.RoleAdmin
		_ = s.userRepo.Update(ctx, user)
	}

	token, exp, err := s.generateJWT(user)
	if err != nil {
		return nil, fmt.Errorf("failed to generate admin token: %w", err)
	}

	return &domain.AuthResponse{
		Token:     token,
		TokenType: "Bearer",
		ExpiresIn: exp,
		User:      *user,
	}, nil
}

func (s *AuthService) generateJWT(u *domain.User) (string, int64, error) {
	expDuration := time.Duration(s.cfg.JWTExpiryHours) * time.Hour
	if expDuration <= 0 {
		expDuration = 168 * time.Hour
	}
	expiresAt := time.Now().Add(expDuration)
	sessionID := uuid.NewString()

	// Enforce single active device session per user: overwrite any prior device session
	s.activeSessions.Store(u.ID, sessionID)
	if s.redisClient != nil {
		sessionKey := fmt.Sprintf("lpc:session:%s", u.ID)
		_ = s.redisClient.Set(context.Background(), sessionKey, sessionID, expDuration).Err()
	}

	claims := domain.UserClaims{
		UserID:    u.ID,
		SessionID: sessionID,
		Role:      u.Role,
		Phone:     u.Phone,
		Email:     u.Email,
		Name:      u.Name,
		RegisteredClaims: jwt.RegisteredClaims{
			ID:        sessionID,
			Subject:   u.ID,
			ExpiresAt: jwt.NewNumericDate(expiresAt),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			Issuer:    "little-polo-cafe",
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	tokenString, err := token.SignedString([]byte(s.cfg.JWTSecret))
	if err != nil {
		return "", 0, err
	}

	return tokenString, expiresAt.Unix(), nil
}

// ValidateSession checks that the token's SessionID matches the user's single active device session.
// If the user logged in on another device or signed out, this returns false.
func (s *AuthService) ValidateSession(ctx context.Context, userID, sessionID string) bool {
	if userID == "" || sessionID == "" {
		return false
	}

	if s.redisClient != nil {
		sessionKey := fmt.Sprintf("lpc:session:%s", userID)
		val, err := s.redisClient.Get(ctx, sessionKey).Result()
		if err == nil {
			return val != "" && val != "REVOKED" && val == sessionID
		}
	}

	if item, ok := s.activeSessions.Load(userID); ok {
		activeSID, ok := item.(string)
		if !ok {
			return false
		}
		return activeSID != "" && activeSID != "REVOKED" && activeSID == sessionID
	}

	return false
}

// Logout revokes the active session for the given user across Redis and memory.
func (s *AuthService) Logout(ctx context.Context, userID string) {
	if userID == "" {
		return
	}
	s.activeSessions.Store(userID, "REVOKED")
	if s.redisClient != nil {
		sessionKey := fmt.Sprintf("lpc:session:%s", userID)
		_ = s.redisClient.Del(ctx, sessionKey).Err()
	}
}

func generate4DigitCode() (string, error) {
	n, err := rand.Int(rand.Reader, big.NewInt(9000))
	if err != nil {
		return "", err
	}
	return fmt.Sprintf("%04d", n.Int64()+1000), nil
}

// ComputeInitials derives 1-2 uppercase initials from a user's full name.
func ComputeInitials(name string) string {
	return computeInitials(name)
}

func computeInitials(name string) string {
	parts := strings.Fields(name)
	if len(parts) == 0 {
		return "LP"
	}
	if len(parts) == 1 {
		return strings.ToUpper(parts[0][:1])
	}
	return strings.ToUpper(parts[0][:1] + parts[len(parts)-1][:1])
}

// HashPassword hashes a raw password using bcrypt.
func HashPassword(password string) (string, error) {
	bytes, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	return string(bytes), err
}

// Register registers a new customer account, hashes the password, sends a welcome email with the LPC logo, and returns the user.
func (s *AuthService) Register(ctx context.Context, req domain.RegisterRequest) (*domain.User, error) {
	name := strings.TrimSpace(req.Name)
	email := strings.TrimSpace(strings.ToLower(req.Email))
	phone := strings.TrimSpace(req.Phone)

	if name == "" || email == "" || phone == "" || req.Password == "" {
		return nil, errors.New("name, email, phone and password are required")
	}

	// Check if user already exists
	if existing, _ := s.userRepo.GetByEmail(ctx, email); existing != nil {
		return nil, ErrUserAlreadyExists
	}
	if existing, _ := s.userRepo.GetByPhone(ctx, phone); existing != nil {
		return nil, ErrUserAlreadyExists
	}

	hashedPassword, err := HashPassword(req.Password)
	if err != nil {
		return nil, fmt.Errorf("failed to hash password: %w", err)
	}

	userID := uuid.New().String()
	user := &domain.User{
		ID:           userID,
		Name:         name,
		Initials:     computeInitials(name),
		Phone:        phone,
		Email:        email,
		PasswordHash: hashedPassword,
		Role:         domain.RoleCustomer,
	}

	if err := s.userRepo.Create(ctx, user); err != nil {
		return nil, fmt.Errorf("failed to save user: %w", err)
	}

	if s.onNewRegistration != nil {
		s.onNewRegistration(user)
	}

	// Dispatch welcome email with Little Polo Cafe logo asynchronously
	go func() {
		_ = s.emailService.SendWelcomeEmail(email, name)
	}()

	return user, nil
}

func (s *AuthService) SetOnNewRegistration(cb func(u *domain.User)) {
	s.onNewRegistration = cb
}

// CustomerLogin authenticates a customer using email or phone and password.
// If the account is an administrator, it enforces 2FA: requiresOtp is true and no JWT is issued until OTP is verified.
func (s *AuthService) CustomerLogin(ctx context.Context, identifier, password string) (*domain.LoginResponse, error) {
	identifier = strings.TrimSpace(identifier)
	var user *domain.User
	var err error

	if strings.Contains(identifier, "@") {
		emailLower := strings.ToLower(identifier)
		user, err = s.userRepo.GetByEmail(ctx, emailLower)
	} else {
		user, err = s.userRepo.GetByPhone(ctx, identifier)
	}

	// Check if this is an admin account attempting to sign in
	isAdminAttempt := strings.EqualFold(identifier, s.cfg.AdminEmail) || (user != nil && user.Role == domain.RoleAdmin)

	if isAdminAttempt {
		adminPasswordValid := false
		if strings.TrimSpace(password) == s.cfg.AdminPassword {
			adminPasswordValid = true
		} else if user != nil && user.PasswordHash != "" {
			if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(password)); err == nil {
				adminPasswordValid = true
			}
		}

		if !adminPasswordValid {
			return nil, ErrInvalidCredentials
		}

		// Valid admin credentials -> require 2FA OTP verification
		if user == nil {
			user = &domain.User{
				ID:       "usr-admin",
				Name:     "Cafe Administrator",
				Initials: "CA",
				Email:    s.cfg.AdminEmail,
				Phone:    "+254704769219",
				Role:     domain.RoleAdmin,
			}
			_ = s.userRepo.Create(ctx, user)
		} else if user.Role != domain.RoleAdmin {
			user.Role = domain.RoleAdmin
			_ = s.userRepo.Update(ctx, user)
		}

		adminPhone := user.Phone
		if adminPhone == "" {
			adminPhone = "+254704769219"
		}

		return &domain.LoginResponse{
			RequiresOTP: true,
			Role:        domain.RoleAdmin,
			Email:       user.Email,
			Phone:       adminPhone,
			Message:     "Administrator 2FA security code required. Choose email or WhatsApp to receive your code.",
		}, nil
	}

	if err != nil || user == nil {
		return nil, ErrInvalidCredentials
	}

	if user.PasswordHash == "" {
		if (s.cfg.Env == "development" || s.cfg.Env == "test") && strings.TrimSpace(password) != "" {
			// Allow pre-seeded demo customer login in development mode
		} else {
			return nil, errors.New("password authentication not set for this account; please sign in with OTP")
		}
	} else {
		if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(password)); err != nil {
			return nil, ErrInvalidCredentials
		}
	}

	token, exp, err := s.generateJWT(user)
	if err != nil {
		return nil, fmt.Errorf("failed to generate token: %w", err)
	}

	return &domain.LoginResponse{
		Token:     token,
		TokenType: "Bearer",
		ExpiresIn: exp,
		User:      user,
	}, nil
}

// ResetPassword hashes and saves a new password for the authenticated user, sends a confirmation email, and issues a fresh JWT.
func (s *AuthService) ResetPassword(ctx context.Context, userID, newPassword string) (*domain.AuthResponse, error) {
	if len(newPassword) < 6 {
		return nil, errors.New("password must be at least 6 characters long")
	}

	user, err := s.userRepo.GetByID(ctx, userID)
	if err != nil || user == nil {
		return nil, postgres.ErrUserNotFound
	}

	hashed, err := HashPassword(newPassword)
	if err != nil {
		return nil, fmt.Errorf("failed to hash password: %w", err)
	}

	user.PasswordHash = hashed
	if err := s.userRepo.Update(ctx, user); err != nil {
		return nil, fmt.Errorf("failed to update password: %w", err)
	}

	// Send password reset confirmation email (zero credentials shared)
	if user.Email != "" && s.emailService != nil {
		targetEmail := user.Email
		targetName := user.Name
		go func() {
			_ = s.emailService.SendPasswordResetConfirmationEmail(targetEmail, targetName)
		}()
	}

	token, exp, err := s.generateJWT(user)
	if err != nil {
		return nil, fmt.Errorf("failed to generate token: %w", err)
	}

	return &domain.AuthResponse{
		Token:     token,
		TokenType: "Bearer",
		ExpiresIn: exp,
		User:      *user,
	}, nil
}
