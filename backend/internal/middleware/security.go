package middleware

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

// SecurityHeaders sets industry-standard defensive HTTP response headers.
func SecurityHeaders() gin.HandlerFunc {
	return func(c *gin.Context) {
		// Prevent MIME type sniffing
		c.Header("X-Content-Type-Options", "nosniff")
		// Prevent Clickjacking
		c.Header("X-Frame-Options", "DENY")
		// Cross-Site Scripting protection filter
		c.Header("X-XSS-Protection", "1; mode=block")
		// Referrer policy
		c.Header("Referrer-Policy", "strict-origin-when-cross-origin")
		// Content-Security-Policy: frame-ancestors prevents clickjacking while allowing mobile/web data fetching
		c.Header("Content-Security-Policy", "frame-ancestors 'none'")
		// Permissions Policy
		c.Header("Permissions-Policy", "camera=(), microphone=(), geolocation=()")

		c.Next()
	}
}

// MaxBodySize limits the maximum allowable request body size to protect against
// oversized payloads, memory exhaustion, and denial-of-service attacks from scanners.
func MaxBodySize(maxBytes int64) gin.HandlerFunc {
	return func(c *gin.Context) {
		if c.Request.Body != nil {
			c.Request.Body = http.MaxBytesReader(c.Writer, c.Request.Body, maxBytes)
		}
		c.Next()
	}
}
