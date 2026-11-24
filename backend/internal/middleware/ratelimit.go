package middleware

import (
	"fmt"
	"net"
	"net/http"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
	redisclient "github.com/redis/go-redis/v9"
)

type memoryLimiter struct {
	mu      sync.Mutex
	counts  map[string]int
	resetAt map[string]time.Time
}

var localLimiter = &memoryLimiter{
	counts:  make(map[string]int),
	resetAt: make(map[string]time.Time),
}

// NormalizeClientIP normalizes an IP address for rate limiting quota keys.
// For IPv4, the canonical 32-bit address is returned.
// For IPv6, the address is masked to its /64 subnet prefix to prevent quota evasion
// via IPv6 address rotation within the assigned subnet.
func NormalizeClientIP(rawIP string) string {
	rawIP = strings.TrimSpace(rawIP)
	// Strip port if present (e.g., "192.168.1.1:12345" or "[2001:db8::1]:80")
	if host, _, err := net.SplitHostPort(rawIP); err == nil {
		rawIP = host
	}

	parsed := net.ParseIP(rawIP)
	if parsed == nil {
		return rawIP
	}

	// Check if IPv4
	if v4 := parsed.To4(); v4 != nil {
		return v4.String()
	}

	// IPv6: Mask to /64 subnet
	mask := net.CIDRMask(64, 128)
	masked := parsed.Mask(mask)
	return masked.String() + "/64"
}

// RateLimit creates a high-concurrency rate limiter for Gin endpoints (e.g. 5 req/min for OTP, 120 req/min for API).
// It normalizes IPv6 addresses to /64 subnets to prevent IP rotation bypass.
func RateLimit(client *redisclient.Client, maxRequests int, window time.Duration) gin.HandlerFunc {
	retryAfterSec := strconv.Itoa(int(window.Seconds()))

	return func(c *gin.Context) {
		clientIP := NormalizeClientIP(c.ClientIP())
		path := c.Request.URL.Path
		key := fmt.Sprintf("lpc:ratelimit:%s:%s", path, clientIP)
		ctx := c.Request.Context()

		if client != nil {
			count, err := client.Incr(ctx, key).Result()
			if err == nil {
				if count == 1 {
					_ = client.Expire(ctx, key, window).Err()
				}
				if count > int64(maxRequests) {
					c.Header("Retry-After", retryAfterSec)
					c.AbortWithStatusJSON(http.StatusTooManyRequests, gin.H{
						"error": "Too many requests. Please slow down and try again shortly.",
					})
					return
				}
				c.Next()
				return
			}
		}

		// In-memory fallback: lock ONLY for counter check/increment, NEVER across c.Next()
		now := time.Now()
		var rateLimited bool

		localLimiter.mu.Lock()
		// Bound memory growth by sweeping expired entries if map grows large
		if len(localLimiter.resetAt) > 1024 {
			for k, exp := range localLimiter.resetAt {
				if now.After(exp) {
					delete(localLimiter.resetAt, k)
					delete(localLimiter.counts, k)
				}
			}
		}

		resetTime, exists := localLimiter.resetAt[key]
		if !exists || now.After(resetTime) {
			localLimiter.counts[key] = 1
			localLimiter.resetAt[key] = now.Add(window)
		} else {
			localLimiter.counts[key]++
			if localLimiter.counts[key] > maxRequests {
				rateLimited = true
			}
		}
		localLimiter.mu.Unlock()

		if rateLimited {
			c.Header("Retry-After", retryAfterSec)
			c.AbortWithStatusJSON(http.StatusTooManyRequests, gin.H{
				"error": "Too many requests. Please slow down and try again shortly.",
			})
			return
		}

		c.Next()
	}
}
