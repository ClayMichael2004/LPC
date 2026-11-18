package middleware

import (
	"context"
	"errors"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"github.com/littlepolocafe/backend/internal/domain"
)

const (
	ContextKeyClaims    = "user_claims"
	ContextKeyUserID    = "user_id"
	ContextKeySessionID = "session_id"
	ContextKeyRole      = "user_role"
)

// SessionValidatorFunc verifies that a token's (userID, sessionID) pair is the currently active session.
type SessionValidatorFunc func(ctx context.Context, userID, sessionID string) bool

// AuthMiddleware validates JWT Bearer tokens, enforces single-device active session validity,
// and sets user identity in the Gin context.
func AuthMiddleware(jwtSecret string, validators ...SessionValidatorFunc) gin.HandlerFunc {
	var validateSession SessionValidatorFunc
	if len(validators) > 0 {
		validateSession = validators[0]
	}

	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Authorization header required"})
			return
		}

		parts := strings.Split(authHeader, " ")
		if len(parts) != 2 || strings.ToLower(parts[0]) != "bearer" {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Invalid authorization format, must be Bearer <token>"})
			return
		}

		tokenString := parts[1]
		claims := &domain.UserClaims{}

		token, err := jwt.ParseWithClaims(tokenString, claims, func(token *jwt.Token) (interface{}, error) {
			if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
				return nil, errors.New("unexpected signing method")
			}
			return []byte(jwtSecret), nil
		})

		if err != nil || !token.Valid {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Invalid or expired authorization token"})
			return
		}

		sessionID := claims.SessionID
		if sessionID == "" {
			sessionID = claims.ID
		}

		// Enforce single-device session check when validator is configured
		if validateSession != nil {
			if !validateSession(c.Request.Context(), claims.UserID, sessionID) {
				c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
					"error": "Your session has ended because your account was signed in on another device or signed out. Please sign in again.",
					"code":  "SESSION_REVOKED",
				})
				return
			}
		}

		c.Set(ContextKeyClaims, claims)
		c.Set(ContextKeyUserID, claims.UserID)
		c.Set(ContextKeySessionID, sessionID)
		c.Set(ContextKeyRole, claims.Role)
		c.Next()
	}
}

// RequireRole enforces Role-Based Access Control (RBAC).
// Allows request only if user's role matches one of allowedRoles.
func RequireRole(allowedRoles ...string) gin.HandlerFunc {
	return func(c *gin.Context) {
		userRole, exists := c.Get(ContextKeyRole)
		if !exists {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Unauthenticated access"})
			return
		}

		roleStr, ok := userRole.(string)
		if !ok {
			c.AbortWithStatusJSON(http.StatusForbidden, gin.H{"error": "Malformed role attribute"})
			return
		}

		hasPermission := false
		for _, allowed := range allowedRoles {
			if roleStr == allowed {
				hasPermission = true
				break
			}
		}

		if !hasPermission {
			c.AbortWithStatusJSON(http.StatusForbidden, gin.H{
				"error": "Insufficient privileges: action requires role " + strings.Join(allowedRoles, " or "),
			})
			return
		}

		c.Next()
	}
}
