package service_test

import (
	"context"
	"testing"

	"github.com/littlepolocafe/backend/internal/config"
	"github.com/littlepolocafe/backend/internal/domain"
	"github.com/littlepolocafe/backend/internal/service"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestSecurity_DisposableEmailBlocklist(t *testing.T) {
	disposableEmails := []string{
		"spammer@mailinator.com",
		"fakeuser@guerrillamail.com",
		"attacker@10minutemail.com",
		"bot@tempmail.com",
		"throwaway@throwawaymail.com",
		"burner@sharklasers.com",
	}

	for _, email := range disposableEmails {
		assert.True(t, service.IsDisposableEmail(email), "Expected %s to be flagged as disposable", email)
	}

	validEmails := []string{
		"customer@gmail.com",
		"guest@yahoo.com",
		"admin@littlepolocafe.com",
		"user@outlook.com",
	}

	for _, email := range validEmails {
		assert.False(t, service.IsDisposableEmail(email), "Expected %s to be accepted as valid", email)
	}
}

func TestSecurity_PasswordComplexityValidation(t *testing.T) {
	weakPasswords := []string{
		"short",         // < 8 chars
		"1234567",       // < 8 chars
		"password",      // common password
		"12345678",      // common password
		"password123",   // common password
		"abcdefgh",      // only letters, no digits
		"987654321",     // only digits, no letters
	}

	for _, pwd := range weakPasswords {
		err := service.ValidatePassword(pwd)
		assert.Error(t, err, "Password '%s' should be rejected as weak/common", pwd)
	}

	strongPasswords := []string{
		"SecureCoffee2026!",
		"KisumuRoast99",
		"BaristaKenya1#",
	}

	for _, pwd := range strongPasswords {
		err := service.ValidatePassword(pwd)
		assert.NoError(t, err, "Password '%s' should be accepted as strong", pwd)
	}
}

func TestSecurity_PhoneValidation(t *testing.T) {
	invalidPhones := []string{
		"123",
		"not-a-number",
		"abcdefghijk",
		"+0000000",
	}

	for _, p := range invalidPhones {
		assert.Error(t, service.ValidatePhone(p), "Phone '%s' should be rejected", p)
	}

	validPhones := []string{
		"+254712345678",
		"+254 700 123 456",
		"+14155552671",
	}

	for _, p := range validPhones {
		assert.NoError(t, service.ValidatePhone(p), "Phone '%s' should be accepted", p)
	}
}

func TestSecurity_NameSanitization(t *testing.T) {
	maliciousNames := []string{
		"<script>alert('xss')</script>",
		"<b>bold</b>",
		"a", // too short (<2 chars)
	}

	for _, n := range maliciousNames {
		_, err := service.SanitizeAndValidateName(n)
		assert.Error(t, err, "Name '%s' should be rejected", n)
	}

	clean, err := service.SanitizeAndValidateName("Michael Clay")
	require.NoError(t, err)
	assert.Equal(t, "Michael Clay", clean)
}

func TestSecurity_PerAccountCodeCaps(t *testing.T) {
	cfg := config.Load()
	cfg.Env = "test"
	userStore := newMockUserStore()
	emailService := service.NewEmailService(cfg)
	authService := service.NewAuthService(cfg, userStore, emailService, nil)

	ctx := context.Background()
	phone := "+254700999888"

	_ = userStore.Create(ctx, &domain.User{
		ID:    "usr-caps",
		Name:  "Test Caps",
		Phone: phone,
		Role:  domain.RoleCustomer,
	})

	// 1st request -> OK
	_, err := authService.RequestOTP(ctx, "whatsapp", phone)
	require.NoError(t, err)

	// 2nd request -> OK
	_, err = authService.RequestOTP(ctx, "whatsapp", phone)
	require.NoError(t, err)

	// 3rd request -> OK
	_, err = authService.RequestOTP(ctx, "whatsapp", phone)
	require.NoError(t, err)

	// 4th request within 10 minutes -> CAPPED!
	_, err = authService.RequestOTP(ctx, "whatsapp", phone)
	assert.ErrorIs(t, err, service.ErrTooManyOTPRequests)
}

func TestSecurity_2FAAttemptBudget_CodeBurned(t *testing.T) {
	cfg := config.Load()
	cfg.Env = "production" // Strict mode (no test bypass)
	userStore := newMockUserStore()
	emailService := service.NewEmailService(cfg)
	authService := service.NewAuthService(cfg, userStore, emailService, nil)

	ctx := context.Background()
	phone := "+254711222333"

	_ = userStore.Create(ctx, &domain.User{
		ID:    "usr-2fa",
		Name:  "Test 2FA",
		Phone: phone,
		Role:  domain.RoleCustomer,
	})

	code, err := authService.RequestOTP(ctx, "whatsapp", phone)
	require.NoError(t, err)

	// Attempts 1 to 4 with incorrect codes
	for i := 1; i <= 4; i++ {
		_, err := authService.VerifyOTP(ctx, phone, "0000", "")
		assert.ErrorIs(t, err, service.ErrInvalidOTP)
	}

	// 5th incorrect attempt -> exceeds budget and burns code!
	_, err = authService.VerifyOTP(ctx, phone, "0000", "")
	assert.ErrorIs(t, err, service.ErrOTPAttemptsExceeded)

	// Even if attacker now submits the real code, it was burned and deleted!
	_, err = authService.VerifyOTP(ctx, phone, code, "")
	assert.Error(t, err)
}

func TestSecurity_AppLoginLockout(t *testing.T) {
	cfg := config.Load()
	cfg.Env = "test"
	userStore := newMockUserStore()
	emailService := service.NewEmailService(cfg)
	authService := service.NewAuthService(cfg, userStore, emailService, nil)

	ctx := context.Background()
	email := "victim@kisumu.ke"
	correctPwd := "CorrectPassword123!"

	_, err := authService.Register(ctx, domain.RegisterRequest{
		Name:     "Victim User",
		Email:    email,
		Phone:    "+254733445566",
		Password: correctPwd,
	})
	require.NoError(t, err)

	// 5 failed password attempts
	for i := 1; i <= 4; i++ {
		_, err := authService.CustomerLogin(ctx, email, "WrongPassword!")
		assert.ErrorIs(t, err, service.ErrInvalidCredentials)
	}

	// 5th failure triggers lockout
	_, err = authService.CustomerLogin(ctx, email, "WrongPassword!")
	assert.ErrorIs(t, err, service.ErrInvalidCredentials)

	// Subsequent login attempt is blocked by account lockout, even with correct password!
	_, err = authService.CustomerLogin(ctx, email, correctPwd)
	assert.ErrorIs(t, err, service.ErrAccountLocked)
}
