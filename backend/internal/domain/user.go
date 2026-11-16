package domain

import (
	"github.com/golang-jwt/jwt/v5"
)

const (
	RoleCustomer = "customer"
	RoleAdmin    = "admin"
)

// User represents an authenticated account in Little Polo Cafe.
type User struct {
	ID           string  `json:"id"`
	Name         string  `json:"name"`
	Initials     string  `json:"initials"`
	Phone        string  `json:"phone"`
	Email        string  `json:"email"`
	PasswordHash string  `json:"-"`
	Role         string  `json:"role"`
	DateOfBirth  *string `json:"dob,omitempty"`
	CreatedAt    EATTime `json:"createdAt"`
	UpdatedAt    EATTime `json:"updatedAt"`
}

// UserClaims defines the JWT claims payload with RBAC role.
type UserClaims struct {
	UserID string `json:"sub"`
	Role   string `json:"role"`
	Phone  string `json:"phone"`
	Email  string `json:"email"`
	Name   string `json:"name"`
	jwt.RegisteredClaims
}

// RegisterRequest represents the payload to register a new customer account.
type RegisterRequest struct {
	Name     string `json:"name" binding:"required"`
	Email    string `json:"email" binding:"required,email"`
	Phone    string `json:"phone" binding:"required"`
	Password string `json:"password" binding:"required,min=6"`
}

// LoginRequest represents customer password login.
type LoginRequest struct {
	Identifier string `json:"identifier" binding:"required"` // email or phone
	Password   string `json:"password" binding:"required"`
}

// OTPRequest represents the payload to request an authentication code.
type OTPRequest struct {
	Type       string `json:"type" binding:"required,oneof=phone email"`
	Identifier string `json:"identifier" binding:"required"`
}

// OTPVerifyRequest represents the payload to verify an OTP.
type OTPVerifyRequest struct {
	Identifier string `json:"identifier" binding:"required"`
	Code       string `json:"code" binding:"required,len=6"`
	Name       string `json:"name,omitempty"`
}

// AdminLoginRequest represents the cafe owner login.
type AdminLoginRequest struct {
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required"`
}

// AuthResponse returns the token and user profile.
type AuthResponse struct {
	Token     string `json:"token"`
	TokenType string `json:"tokenType"`
	ExpiresIn int64  `json:"expiresIn"`
	User      User   `json:"user"`
}
