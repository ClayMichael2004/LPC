package service_test

import (
	"context"
	"errors"
	"testing"

	"github.com/littlepolocafe/backend/internal/config"
	"github.com/littlepolocafe/backend/internal/domain"
	"github.com/littlepolocafe/backend/internal/repository/postgres"
	"github.com/littlepolocafe/backend/internal/service"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

type mockUserStore struct {
	users map[string]*domain.User
}

func newMockUserStore() *mockUserStore {
	return &mockUserStore{users: make(map[string]*domain.User)}
}

func (m *mockUserStore) Create(ctx context.Context, u *domain.User) error {
	m.users[u.ID] = u
	return nil
}

func (m *mockUserStore) GetByID(ctx context.Context, id string) (*domain.User, error) {
	if u, ok := m.users[id]; ok {
		return u, nil
	}
	return nil, postgres.ErrUserNotFound
}

func (m *mockUserStore) GetByPhone(ctx context.Context, phone string) (*domain.User, error) {
	for _, u := range m.users {
		if u.Phone == phone {
			return u, nil
		}
	}
	return nil, postgres.ErrUserNotFound
}

func (m *mockUserStore) GetByEmail(ctx context.Context, email string) (*domain.User, error) {
	for _, u := range m.users {
		if u.Email == email {
			return u, nil
		}
	}
	return nil, postgres.ErrUserNotFound
}

func (m *mockUserStore) Update(ctx context.Context, u *domain.User) error {
	m.users[u.ID] = u
	return nil
}

func TestAuthService_PhoneOTPWorkflow(t *testing.T) {
	cfg := config.Load()
	cfg.Env = "test"
	userStore := newMockUserStore()
	emailService := service.NewEmailService(cfg)
	authService := service.NewAuthService(cfg, userStore, emailService, nil)

	ctx := context.Background()
	phone := "+254712345678"

	// 1. Request OTP
	code, err := authService.RequestOTP(ctx, "phone", phone)
	require.NoError(t, err)
	assert.Len(t, code, 6)

	// 2. Verify with wrong code -> Fail
	_, err = authService.VerifyOTP(ctx, phone, "000000", "Michael")
	assert.ErrorIs(t, err, service.ErrInvalidOTP)

	// 3. Verify with correct code -> Success & JWT issued
	authResp, err := authService.VerifyOTP(ctx, phone, code, "Michael Clay")
	require.NoError(t, err)
	require.NotNil(t, authResp)

	assert.NotEmpty(t, authResp.Token)
	assert.Equal(t, domain.RoleCustomer, authResp.User.Role)
	assert.Equal(t, phone, authResp.User.Phone)
	assert.Equal(t, "Michael Clay", authResp.User.Name)
}

func TestAuthService_EmailOTPWorkflow(t *testing.T) {
	cfg := config.Load()
	cfg.Env = "test"
	cfg.OTPSenderEmail = "mikewillmakeit2004@gmail.com"
	userStore := newMockUserStore()
	emailService := service.NewEmailService(cfg)
	authService := service.NewAuthService(cfg, userStore, emailService, nil)

	ctx := context.Background()
	email := "mikewillmakeit2004@gmail.com"

	// 1. Request OTP using user's email
	code, err := authService.RequestOTP(ctx, "email", email)
	require.NoError(t, err)
	assert.Len(t, code, 6)

	// 2. Verify OTP
	authResp, err := authService.VerifyOTP(ctx, email, code, "Mike Admin")
	require.NoError(t, err)
	assert.NotEmpty(t, authResp.Token)
	assert.Equal(t, email, authResp.User.Email)
}

func TestAuthService_AdminLogin(t *testing.T) {
	cfg := config.Load()
	cfg.AdminEmail = "mikewillmakeit2004@gmail.com"
	cfg.AdminPassword = "AdminLPC2026!"
	userStore := newMockUserStore()
	emailService := service.NewEmailService(cfg)
	authService := service.NewAuthService(cfg, userStore, emailService, nil)

	ctx := context.Background()

	// Invalid password -> Fail
	_, err := authService.AdminLogin(ctx, cfg.AdminEmail, "WrongPassword")
	assert.True(t, errors.Is(err, service.ErrInvalidAdminAuth))

	// Correct password -> Success with Admin role
	adminResp, err := authService.AdminLogin(ctx, cfg.AdminEmail, cfg.AdminPassword)
	require.NoError(t, err)
	require.NotNil(t, adminResp)

	assert.NotEmpty(t, adminResp.Token)
	assert.Equal(t, domain.RoleAdmin, adminResp.User.Role)
	assert.Equal(t, cfg.AdminEmail, adminResp.User.Email)
}

func TestAuthService_RegisterAndCustomerLogin(t *testing.T) {
	cfg := config.Load()
	cfg.Env = "test"
	userStore := newMockUserStore()
	emailService := service.NewEmailService(cfg)
	authService := service.NewAuthService(cfg, userStore, emailService, nil)

	ctx := context.Background()

	// 1. Register new customer
	regReq := domain.RegisterRequest{
		Name:     "Michael Clay",
		Email:    "michaelclay2225@gmail.com",
		Phone:    "+254712345678",
		Password: "Password123!",
	}

	createdUser, err := authService.Register(ctx, regReq)
	require.NoError(t, err)
	require.NotNil(t, createdUser)
	assert.Equal(t, "Michael Clay", createdUser.Name)
	assert.Equal(t, "MC", createdUser.Initials)
	assert.Equal(t, domain.RoleCustomer, createdUser.Role)
	assert.NotEmpty(t, createdUser.ID)

	// 2. Duplicate registration -> 409 Conflict error
	_, err = authService.Register(ctx, regReq)
	assert.ErrorIs(t, err, service.ErrUserAlreadyExists)

	// 3. Customer login with wrong password -> Fail
	_, err = authService.CustomerLogin(ctx, regReq.Email, "WrongPassword")
	assert.ErrorIs(t, err, service.ErrInvalidCredentials)

	// 4. Customer login with correct password -> Success with JWT token
	loginResp, err := authService.CustomerLogin(ctx, regReq.Email, "Password123!")
	require.NoError(t, err)
	require.NotNil(t, loginResp)
	assert.NotEmpty(t, loginResp.Token)
	assert.Equal(t, "Bearer", loginResp.TokenType)
	assert.Equal(t, "Michael Clay", loginResp.User.Name)
	assert.Equal(t, domain.RoleCustomer, loginResp.User.Role)

	// 5. Test Welcome Email Dispatch directly
	err = emailService.SendWelcomeEmail(regReq.Email, regReq.Name)
	assert.NoError(t, err)
}
