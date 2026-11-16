package redis

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"sync"
	"time"

	redisclient "github.com/redis/go-redis/v9"
)

const (
	IdempotencyKeyPrefix = "lpc:idempotency:"
	IdempotencyTTL       = 24 * time.Hour

	StateProcessing = "PROCESSING"
	StateCompleted  = "COMPLETED"
)

type CachedResponse struct {
	State      string `json:"state"`
	StatusCode int    `json:"statusCode"`
	Body       string `json:"body"`
}

type IdempotencyStore struct {
	client *redisclient.Client
	local  sync.Map
}

func NewIdempotencyStore(client *redisclient.Client) *IdempotencyStore {
	return &IdempotencyStore{client: client}
}

// AcquireLock attempts to set a processing lock on an idempotency key using SETNX.
// Returns true if lock was acquired, false if key already exists.
func (s *IdempotencyStore) AcquireLock(ctx context.Context, key string) (bool, *CachedResponse, error) {
	if s.client == nil {
		// Thread-safe in-memory fallback
		initResp := CachedResponse{State: StateProcessing}
		val, loaded := s.local.LoadOrStore(key, initResp)
		if loaded {
			existing := val.(CachedResponse)
			return false, &existing, nil
		}
		return true, nil, nil
	}

	redisKey := IdempotencyKeyPrefix + key

	initPayload, _ := json.Marshal(CachedResponse{
		State: StateProcessing,
	})

	success, err := s.client.SetNX(ctx, redisKey, initPayload, IdempotencyTTL).Result()
	if err != nil {
		log.Printf("[Idempotency Warning] Redis SetNX error: %v", err)
		return true, nil, nil
	}

	if success {
		// Acquired new lock
		return true, nil, nil
	}

	// Key already exists, fetch existing state
	existingVal, err := s.client.Get(ctx, redisKey).Result()
	if err != nil {
		return false, nil, fmt.Errorf("failed to get existing idempotency record: %w", err)
	}

	var resp CachedResponse
	if err := json.Unmarshal([]byte(existingVal), &resp); err != nil {
		return false, nil, fmt.Errorf("failed to unmarshal idempotency response: %w", err)
	}

	return false, &resp, nil
}

// SaveResponse updates the idempotency key with the final HTTP status code and response body.
func (s *IdempotencyStore) SaveResponse(ctx context.Context, key string, statusCode int, body []byte) error {
	payloadObj := CachedResponse{
		State:      StateCompleted,
		StatusCode: statusCode,
		Body:       string(body),
	}

	if s.client == nil {
		s.local.Store(key, payloadObj)
		return nil
	}

	redisKey := IdempotencyKeyPrefix + key
	payload, err := json.Marshal(payloadObj)
	if err != nil {
		return err
	}

	return s.client.Set(ctx, redisKey, payload, IdempotencyTTL).Err()
}

// ReleaseLock removes the key from Redis in the event of an unrecoverable failure or 4xx client error,
// allowing the user to correct the payload and retry.
func (s *IdempotencyStore) ReleaseLock(ctx context.Context, key string) error {
	if s.client == nil {
		s.local.Delete(key)
		return nil
	}
	return s.client.Del(ctx, IdempotencyKeyPrefix+key).Err()
}
