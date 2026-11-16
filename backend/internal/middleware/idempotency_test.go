package middleware_test

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/alicebob/miniredis/v2"
	"github.com/gin-gonic/gin"
	"github.com/littlepolocafe/backend/internal/middleware"
	"github.com/littlepolocafe/backend/internal/repository/redis"
	redisclient "github.com/redis/go-redis/v9"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestIdempotencyMiddleware_ExactReplay(t *testing.T) {
	gin.SetMode(gin.TestMode)

	// Start fast in-memory Redis
	mr := miniredis.RunT(t)
	rdb := redisclient.NewClient(&redisclient.Options{Addr: mr.Addr()})
	store := redis.NewIdempotencyStore(rdb)

	callCount := 0
	r := gin.New()
	r.Use(middleware.IdempotencyMiddleware(store))
	r.POST("/api/v1/orders", func(c *gin.Context) {
		callCount++
		c.JSON(http.StatusCreated, gin.H{
			"orderId": "LPC-8924",
			"status":  "PENDING",
			"total":   1500.00,
		})
	})

	idempotencyKey := "idemp-key-xyz-123"

	// 1. Initial Order Placement Request
	w1 := httptest.NewRecorder()
	req1, _ := http.NewRequest(http.MethodPost, "/api/v1/orders", nil)
	req1.Header.Set("Idempotency-Key", idempotencyKey)
	r.ServeHTTP(w1, req1)

	assert.Equal(t, http.StatusCreated, w1.Code)
	assert.Equal(t, 1, callCount)
	assert.Empty(t, w1.Header().Get("Idempotent-Replayed"))
	assert.Contains(t, w1.Body.String(), "LPC-8924")

	// 2. Duplicate Request with Same Idempotency-Key
	w2 := httptest.NewRecorder()
	req2, _ := http.NewRequest(http.MethodPost, "/api/v1/orders", nil)
	req2.Header.Set("Idempotency-Key", idempotencyKey)
	r.ServeHTTP(w2, req2)

	assert.Equal(t, http.StatusCreated, w2.Code)
	assert.Equal(t, 1, callCount, "Handler must NOT be executed twice for duplicate idempotency key")
	assert.Equal(t, "true", w2.Header().Get("Idempotent-Replayed"), "Should return Idempotent-Replayed: true header")
	assert.Equal(t, w1.Body.String(), w2.Body.String())
}

func TestIdempotencyMiddleware_ConcurrentConflict(t *testing.T) {
	gin.SetMode(gin.TestMode)

	mr := miniredis.RunT(t)
	rdb := redisclient.NewClient(&redisclient.Options{Addr: mr.Addr()})
	store := redis.NewIdempotencyStore(rdb)

	r := gin.New()
	r.Use(middleware.IdempotencyMiddleware(store))
	r.POST("/api/v1/orders", func(c *gin.Context) {
		time.Sleep(10 * time.Millisecond)
		c.Status(http.StatusCreated)
	})

	// Pre-lock key into PROCESSING state
	key := "concurrent-test-key"
	_, _, err := store.AcquireLock(context.Background(), key)
	require.NoError(t, err)

	// Second request arrives while first is still PROCESSING
	w := httptest.NewRecorder()
	req, _ := http.NewRequest(http.MethodPost, "/api/v1/orders", nil)
	req.Header.Set("Idempotency-Key", key)
	r.ServeHTTP(w, req)

	assert.Equal(t, http.StatusConflict, w.Code)
	assert.Contains(t, w.Body.String(), "currently being processed")
}
