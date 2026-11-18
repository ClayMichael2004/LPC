package middleware

import (
	"bytes"
	"fmt"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/littlepolocafe/backend/internal/repository/redis"
)

type bodyLogWriter struct {
	gin.ResponseWriter
	body *bytes.Buffer
}

func (w bodyLogWriter) Write(b []byte) (int, error) {
	w.body.Write(b)
	return w.ResponseWriter.Write(b)
}

// IdempotencyMiddleware ensures mutating requests with an `Idempotency-Key` header
// are processed exactly once per authenticated user and subsequent retries return cached responses.
func IdempotencyMiddleware(store *redis.IdempotencyStore) gin.HandlerFunc {
	return func(c *gin.Context) {
		rawKey := c.GetHeader("Idempotency-Key")
		if rawKey == "" {
			c.Next()
			return
		}

		// Strictly namespace idempotency key by authenticated user ID to prevent cross-account replay
		userID := c.GetString(ContextKeyUserID)
		idempotencyKey := rawKey
		if userID != "" {
			idempotencyKey = fmt.Sprintf("uid:%s:key:%s", userID, rawKey)
		}

		ctx := c.Request.Context()
		acquired, existing, err := store.AcquireLock(ctx, idempotencyKey)
		if err != nil {
			c.AbortWithStatusJSON(http.StatusInternalServerError, gin.H{
				"error": "Failed to verify idempotency state",
			})
			return
		}

		if !acquired && existing != nil {
			if existing.State == redis.StateProcessing {
				c.AbortWithStatusJSON(http.StatusConflict, gin.H{
					"error": "A request with this Idempotency-Key is currently being processed",
				})
				return
			}

			if existing.State == redis.StateCompleted {
				// Replay the exact cached response
				c.Header("Idempotent-Replayed", "true")
				c.Header("Content-Type", "application/json")
				c.String(existing.StatusCode, existing.Body)
				c.Abort()
				return
			}
		}

		// Intercept response to capture body and status code
		blw := &bodyLogWriter{body: bytes.NewBufferString(""), ResponseWriter: c.Writer}
		c.Writer = blw

		c.Next()

		statusCode := c.Writer.Status()
		if statusCode >= 200 && statusCode < 300 {
			// Save completed response in Redis
			_ = store.SaveResponse(ctx, idempotencyKey, statusCode, blw.body.Bytes())
		} else {
			// On error, release the lock so the client can fix and retry
			_ = store.ReleaseLock(ctx, idempotencyKey)
		}
	}
}
