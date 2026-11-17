package middleware

import (
	"fmt"
	"net/http"
	"strconv"
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

// RateLimit creates a high-concurrency rate limiter for Gin endpoints (e.g. 5 req/min for OTP, 120 req/min for API).
func RateLimit(client *redisclient.Client, maxRequests int, window time.Duration) gin.HandlerFunc {
	retryAfterSec := strconv.Itoa(int(window.Seconds()))

	return func(c *gin.Context) {
		clientIP := c.ClientIP()
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
