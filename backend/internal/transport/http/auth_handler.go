package http

import (
	"errors"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/littlepolocafe/backend/internal/domain"
	"github.com/littlepolocafe/backend/internal/middleware"
	"github.com/littlepolocafe/backend/internal/service"
)

type AuthHandler struct {
	authService *service.AuthService
	userRepo    service.UserStore
}

func NewAuthHandler(authService *service.AuthService, userRepo service.UserStore) *AuthHandler {
	return &AuthHandler{
		authService: authService,
		userRepo:    userRepo,
	}
}

// Register handles new customer registration and triggers welcome email dispatch.
func (h *AuthHandler) Register(c *gin.Context) {
	var req domain.RegisterRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		JSONError(c, http.StatusBadRequest, "Invalid registration payload. Name, email, phone, and password (min 6 characters) are required.")
		return
	}

	user, err := h.authService.Register(c.Request.Context(), req)
	if err != nil {
		if errors.Is(err, service.ErrUserAlreadyExists) {
			JSONError(c, http.StatusConflict, err.Error())
			return
		}
		JSONError(c, http.StatusBadRequest, err.Error())
		return
	}

	JSONSuccess(c, http.StatusCreated, gin.H{
		"message": "Registration successful! A welcome email with the Little Polo Cafe logo has been sent to your email address.",
		"user":    user,
	})
}

// CustomerLogin authenticates a customer using email or phone and password.
func (h *AuthHandler) CustomerLogin(c *gin.Context) {
	var req domain.LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		JSONError(c, http.StatusBadRequest, "Identifier (email or phone) and password are required.")
		return
	}

	authResp, err := h.authService.CustomerLogin(c.Request.Context(), req.Identifier, req.Password)
	if err != nil {
		if errors.Is(err, service.ErrInvalidCredentials) {
			JSONError(c, http.StatusUnauthorized, "Invalid email/phone or password.")
			return
		}
		JSONError(c, http.StatusBadRequest, err.Error())
		return
	}

	JSONSuccess(c, http.StatusOK, authResp)
}

// RequestOTP sends a 4-digit verification code to phone or email.
func (h *AuthHandler) RequestOTP(c *gin.Context) {
	var req domain.OTPRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		JSONError(c, http.StatusBadRequest, "Invalid request. 'type' must be 'phone' or 'email' and 'identifier' is required.")
		return
	}

	_, err := h.authService.RequestOTP(c.Request.Context(), req.Type, req.Identifier)
	if err != nil {
		JSONError(c, http.StatusInternalServerError, "Failed to send OTP code. Please try again.")
		return
	}

	JSONSuccess(c, http.StatusOK, gin.H{
		"message":    "Verification code sent successfully",
		"identifier": req.Identifier,
		"type":       req.Type,
		"expiresIn":  int(service.OTPExpiryDuration.Seconds()),
	})
}

// VerifyOTP checks the submitted 4-digit code and returns a JWT token.
func (h *AuthHandler) VerifyOTP(c *gin.Context) {
	var req domain.OTPVerifyRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		JSONError(c, http.StatusBadRequest, "Identifier and 4-digit code are required.")
		return
	}

	authResp, err := h.authService.VerifyOTP(c.Request.Context(), req.Identifier, req.Code, req.Name)
	if err != nil {
		if errors.Is(err, service.ErrExpiredOTP) {
			JSONError(c, http.StatusUnauthorized, "This verification code has expired. Codes are valid for 5 minutes — please request a new code.")
			return
		}
		if errors.Is(err, service.ErrInvalidOTP) {
			JSONError(c, http.StatusUnauthorized, "Invalid or expired verification code.")
			return
		}
		JSONError(c, http.StatusInternalServerError, "Authentication failed: "+err.Error())
		return
	}

	JSONSuccess(c, http.StatusOK, authResp)
}

// ResetPassword sets a new password for the authenticated user after OTP verification.
func (h *AuthHandler) ResetPassword(c *gin.Context) {
	userID := c.GetString(middleware.ContextKeyUserID)
	if userID == "" {
		JSONError(c, http.StatusUnauthorized, "Unauthorized")
		return
	}

	var req domain.ResetPasswordRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		JSONError(c, http.StatusBadRequest, "A new password of at least 6 characters is required.")
		return
	}

	authResp, err := h.authService.ResetPassword(c.Request.Context(), userID, req.NewPassword)
	if err != nil {
		JSONError(c, http.StatusBadRequest, err.Error())
		return
	}

	JSONSuccess(c, http.StatusOK, authResp)
}

// AdminLogin authenticates the cafe owner administrator.
func (h *AuthHandler) AdminLogin(c *gin.Context) {
	var req domain.AdminLoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		JSONError(c, http.StatusBadRequest, "Email and password are required.")
		return
	}

	authResp, err := h.authService.AdminLogin(c.Request.Context(), req.Email, req.Password)
	if err != nil {
		if errors.Is(err, service.ErrInvalidAdminAuth) {
			JSONError(c, http.StatusUnauthorized, "Invalid admin email or password.")
			return
		}
		JSONError(c, http.StatusInternalServerError, "Admin authentication error: "+err.Error())
		return
	}

	JSONSuccess(c, http.StatusOK, authResp)
}

// GetProfile retrieves the authenticated user's profile.
func (h *AuthHandler) GetProfile(c *gin.Context) {
	userID := c.GetString(middleware.ContextKeyUserID)
	user, err := h.userRepo.GetByID(c.Request.Context(), userID)
	if err != nil {
		JSONError(c, http.StatusNotFound, "User profile not found")
		return
	}

	JSONSuccess(c, http.StatusOK, user)
}

// UpdateProfile updates personal information.
func (h *AuthHandler) UpdateProfile(c *gin.Context) {
	userID := c.GetString(middleware.ContextKeyUserID)
	user, err := h.userRepo.GetByID(c.Request.Context(), userID)
	if err != nil {
		JSONError(c, http.StatusNotFound, "User not found")
		return
	}

	var req struct {
		Name  *string `json:"name"`
		Phone *string `json:"phone"`
		Email *string `json:"email"`
		Dob   *string `json:"dob"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		JSONError(c, http.StatusBadRequest, "Invalid profile payload")
		return
	}

	if req.Name != nil && *req.Name != "" {
		user.Name = *req.Name
	}
	if req.Phone != nil && *req.Phone != "" {
		user.Phone = *req.Phone
	}
	if req.Email != nil {
		user.Email = *req.Email
	}
	if req.Dob != nil {
		user.DateOfBirth = req.Dob
	}

	if err := h.userRepo.Update(c.Request.Context(), user); err != nil {
		JSONError(c, http.StatusInternalServerError, "Failed to update profile: "+err.Error())
		return
	}

	JSONSuccess(c, http.StatusOK, user)
}
