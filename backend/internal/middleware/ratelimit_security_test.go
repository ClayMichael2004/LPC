package middleware_test

import (
	"bytes"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/littlepolocafe/backend/internal/middleware"
	"github.com/stretchr/testify/assert"
)

func TestSecurity_IPv6QuotaKeys(t *testing.T) {
	// IPv4 should remain unchanged
	ipv4 := "192.168.1.100"
	assert.Equal(t, "192.168.1.100", middleware.NormalizeClientIP(ipv4))

	// IPv4 with port should strip port
	ipv4WithPort := "192.168.1.100:43210"
	assert.Equal(t, "192.168.1.100", middleware.NormalizeClientIP(ipv4WithPort))

	// IPv6 addresses in the same /64 subnet must normalize to the exact same /64 quota key
	ipv6Host1 := "2001:0db8:85a3:0000:0000:8a2e:0370:7334"
	ipv6Host2 := "2001:0db8:85a3:0000:ffff:ffff:ffff:ffff"
	ipv6Host3 := "2001:db8:85a3::1"

	norm1 := middleware.NormalizeClientIP(ipv6Host1)
	norm2 := middleware.NormalizeClientIP(ipv6Host2)
	norm3 := middleware.NormalizeClientIP(ipv6Host3)

	assert.Equal(t, "2001:db8:85a3::/64", norm1)
	assert.Equal(t, norm1, norm2, "Different IPv6 addresses in same /64 must share quota key")
	assert.Equal(t, norm1, norm3, "Abbreviated IPv6 in same /64 must match normalized quota key")

	// IPv6 in a different /64 subnet must produce a different quota key
	differentSubnet := "2001:db8:9999::1"
	normDiff := middleware.NormalizeClientIP(differentSubnet)
	assert.NotEqual(t, norm1, normDiff)
}

func TestSecurity_SecurityHeadersMiddleware(t *testing.T) {
	gin.SetMode(gin.TestMode)
	r := gin.New()
	r.Use(middleware.SecurityHeaders())
	r.GET("/test-headers", func(c *gin.Context) {
		c.String(http.StatusOK, "ok")
	})

	w := httptest.NewRecorder()
	req, _ := http.NewRequest(http.MethodGet, "/test-headers", nil)
	r.ServeHTTP(w, req)

	assert.Equal(t, "nosniff", w.Header().Get("X-Content-Type-Options"))
	assert.Equal(t, "DENY", w.Header().Get("X-Frame-Options"))
	assert.Equal(t, "1; mode=block", w.Header().Get("X-XSS-Protection"))
	assert.Equal(t, "strict-origin-when-cross-origin", w.Header().Get("Referrer-Policy"))
	assert.Equal(t, "default-src 'none'; frame-ancestors 'none'", w.Header().Get("Content-Security-Policy"))
}

func TestSecurity_MaxBodySizeMiddleware(t *testing.T) {
	gin.SetMode(gin.TestMode)
	r := gin.New()
	// Limit to 100 bytes for this test
	r.Use(middleware.MaxBodySize(100))
	r.POST("/test-body", func(c *gin.Context) {
		var req map[string]string
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Payload too large or malformed"})
			return
		}
		c.JSON(http.StatusOK, gin.H{"status": "ok"})
	})

	// 1. Normal payload (<100 bytes) -> Success
	smallBody := bytes.NewReader([]byte(`{"name":"ok"}`))
	w1 := httptest.NewRecorder()
	req1, _ := http.NewRequest(http.MethodPost, "/test-body", smallBody)
	req1.Header.Set("Content-Type", "application/json")
	r.ServeHTTP(w1, req1)
	assert.Equal(t, http.StatusOK, w1.Code)

	// 2. Large oversized payload (>100 bytes) -> Blocked
	largeBody := bytes.NewReader(bytes.Repeat([]byte("A"), 500))
	w2 := httptest.NewRecorder()
	req2, _ := http.NewRequest(http.MethodPost, "/test-body", largeBody)
	req2.Header.Set("Content-Type", "application/json")
	r.ServeHTTP(w2, req2)
	assert.Equal(t, http.StatusBadRequest, w2.Code)
}

func TestSecurity_RateLimit_IPv6SubnetEviction(t *testing.T) {
	gin.SetMode(gin.TestMode)
	r := gin.New()
	_ = r.SetTrustedProxies(nil)

	// Max 2 requests per 10 seconds
	r.Use(middleware.RateLimit(nil, 2, 10*time.Second))
	r.GET("/limited", func(c *gin.Context) {
		c.String(http.StatusOK, "ok")
	})

	// Request 1 from host ::1
	w1 := httptest.NewRecorder()
	req1, _ := http.NewRequest(http.MethodGet, "/limited", nil)
	req1.RemoteAddr = "[2001:db8:1234:5678::1]:1234"
	r.ServeHTTP(w1, req1)
	assert.Equal(t, http.StatusOK, w1.Code)

	// Request 2 from host ::2 (same /64 subnet)
	w2 := httptest.NewRecorder()
	req2, _ := http.NewRequest(http.MethodGet, "/limited", nil)
	req2.RemoteAddr = "[2001:db8:1234:5678::2]:1234"
	r.ServeHTTP(w2, req2)
	assert.Equal(t, http.StatusOK, w2.Code)

	// Request 3 from host ::3 (rotated IP within same /64 subnet) -> Must be RATE LIMITED!
	w3 := httptest.NewRecorder()
	req3, _ := http.NewRequest(http.MethodGet, "/limited", nil)
	req3.RemoteAddr = "[2001:db8:1234:5678::3]:1234"
	r.ServeHTTP(w3, req3)
	assert.Equal(t, http.StatusTooManyRequests, w3.Code)
}
