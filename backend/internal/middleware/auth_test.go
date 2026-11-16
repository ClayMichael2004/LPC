package middleware_test

import (
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"github.com/littlepolocafe/backend/internal/domain"
	"github.com/littlepolocafe/backend/internal/middleware"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

const testSecret = "test-jwt-secret-key-east-africa"

func createTestToken(role string) string {
	claims := domain.UserClaims{
		UserID: "usr-123",
		Role:   role,
		Phone:  "+254712345678",
		Email:  "test@littlepolocafe.ke",
		RegisteredClaims: jwt.RegisteredClaims{
			Subject:   "usr-123",
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(1 * time.Hour)),
		},
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	s, _ := token.SignedString([]byte(testSecret))
	return s
}

func TestRBAC_CustomerCannotAccessAdminRoutes(t *testing.T) {
	gin.SetMode(gin.TestMode)
	r := gin.New()

	r.Use(middleware.AuthMiddleware(testSecret))

	// Customer allowed route
	r.GET("/api/v1/customer/profile", middleware.RequireRole(domain.RoleCustomer, domain.RoleAdmin), func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "customer ok"})
	})

	// Admin-only route
	r.GET("/api/v1/admin/dashboard", middleware.RequireRole(domain.RoleAdmin), func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "admin ok"})
	})

	customerToken := createTestToken(domain.RoleCustomer)
	adminToken := createTestToken(domain.RoleAdmin)

	// 1. Customer accesses customer route -> 200 OK
	w := httptest.NewRecorder()
	req, _ := http.NewRequest(http.MethodGet, "/api/v1/customer/profile", nil)
	req.Header.Set("Authorization", "Bearer "+customerToken)
	r.ServeHTTP(w, req)
	assert.Equal(t, http.StatusOK, w.Code)

	// 2. Customer accesses admin-only route -> 403 Forbidden
	w = httptest.NewRecorder()
	req, _ = http.NewRequest(http.MethodGet, "/api/v1/admin/dashboard", nil)
	req.Header.Set("Authorization", "Bearer "+customerToken)
	r.ServeHTTP(w, req)
	assert.Equal(t, http.StatusForbidden, w.Code)
	assert.Contains(t, w.Body.String(), "Insufficient privileges")

	// 3. Admin accesses admin route -> 200 OK
	w = httptest.NewRecorder()
	req, _ = http.NewRequest(http.MethodGet, "/api/v1/admin/dashboard", nil)
	req.Header.Set("Authorization", "Bearer "+adminToken)
	r.ServeHTTP(w, req)
	assert.Equal(t, http.StatusOK, w.Code)

	// 4. Missing token -> 401 Unauthorized
	w = httptest.NewRecorder()
	req, _ = http.NewRequest(http.MethodGet, "/api/v1/admin/dashboard", nil)
	r.ServeHTTP(w, req)
	assert.Equal(t, http.StatusUnauthorized, w.Code)
}

func TestAuthMiddleware_InvalidToken(t *testing.T) {
	gin.SetMode(gin.TestMode)
	r := gin.New()
	r.Use(middleware.AuthMiddleware(testSecret))
	r.GET("/test", func(c *gin.Context) { c.Status(http.StatusOK) })

	// Malformed token format
	w := httptest.NewRecorder()
	req, _ := http.NewRequest(http.MethodGet, "/test", nil)
	req.Header.Set("Authorization", "Token abc")
	r.ServeHTTP(w, req)
	assert.Equal(t, http.StatusUnauthorized, w.Code)

	// Forged token signed with wrong secret
	forged := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{"sub": "bad"})
	forgedStr, _ := forged.SignedString([]byte("wrong-secret"))
	w = httptest.NewRecorder()
	req, _ = http.NewRequest(http.MethodGet, "/test", nil)
	req.Header.Set("Authorization", "Bearer "+forgedStr)
	r.ServeHTTP(w, req)
	assert.Equal(t, http.StatusUnauthorized, w.Code)
	require.Contains(t, w.Body.String(), "Invalid or expired")
}
