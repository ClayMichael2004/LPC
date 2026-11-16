package middleware

import (
	"fmt"
	"net/http"
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

// RateLimit creates a rate limiter for Gin endpoints (e.g. 5 req/min for OTP, 100 req/min for API).
func RateLimit(client *redisclient.Client, maxRequests int, window time.Duration) gin.HandlerFunc {
	return func(c *gin.Context) {
		clientIP := c.ClientIP()
		path := c.Request.URL.Path
		key := fmt.Sprintf("lpc:ratelimit:%s:%s", path, clientIP)
		ctx := c.Request.Context()

		if client != nil {
			// Redis sliding counter
			count, err := client.Incr(ctx, key).Result()
			if err == nil {
				if count == 1 {
					_ = client.Expire(ctx, key, window).Err()
				}
				if count > int64(maxRequests) {
					c.Header("Retry-After", fmt.Sprintf("%d", int(window.Seconds())))
					c.AbortWithStatusJSON(http.StatusTooManyRequests, gin.H{
						"error": "Too many requests. Please slow down and try again shortly.",
					})
					return
				}
				c.Next()
				return
			}
		}

		// In-memory fallback
		localLimiter.mu.Lock()
		defer localLimiter.mu.Unlock()

		now := time.Now()
		resetTime, exists := localLimiter.resetAt[key]
		if !exists || now.After(resetTime) {
			localLimiter.counts[key] = 1
			localLimiter.resetAt[key] = now.Add(window)
		} else {
			localLimiter.counts[key]++
			if localLimiter.counts[key] > maxRequests {
				c.Header("Retry-After", fmt.Sprintf("%d", int(window.Seconds())))
				c.AbortWithStatusJSON(http.StatusTooManyRequests, gin.H{
					"error": "Too many requests. Please slow down and try again shortly.",
				})
				return
			}
		}

		c.Next()
	}
}
