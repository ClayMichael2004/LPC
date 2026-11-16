package redis

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"time"

	"github.com/littlepolocafe/backend/internal/domain"
	redisclient "github.com/redis/go-redis/v9"
)

const (
	MenuAllKey        = "lpc:menu:all"
	MenuCategoriesKey = "lpc:menu:categories"
	MenuProductsKey   = "lpc:menu:products"
	DefaultMenuTTL    = 1 * time.Hour
)

type MenuCache struct {
	client *redisclient.Client
}

func NewMenuCache(client *redisclient.Client) *MenuCache {
	return &MenuCache{client: client}
}

// GetFullMenu checks Redis cache for the serialized full menu.
func (c *MenuCache) GetFullMenu(ctx context.Context) (*domain.FullMenu, error) {
	if c.client == nil {
		return nil, nil
	}
	val, err := c.client.Get(ctx, MenuAllKey).Result()
	if err == redisclient.Nil {
		return nil, nil // Cache miss
	}
	if err != nil {
		log.Printf("[Redis Cache Warning] Failed to get menu from cache: %v", err)
		return nil, nil // Graceful degradation to DB
	}

	var menu domain.FullMenu
	if err := json.Unmarshal([]byte(val), &menu); err != nil {
		return nil, fmt.Errorf("failed to unmarshal cached menu: %w", err)
	}

	return &menu, nil
}

// SetFullMenu caches the full menu in Redis with TTL.
func (c *MenuCache) SetFullMenu(ctx context.Context, menu *domain.FullMenu, ttl time.Duration) error {
	if c.client == nil {
		return nil
	}
	if ttl <= 0 {
		ttl = DefaultMenuTTL
	}
	data, err := json.Marshal(menu)
	if err != nil {
		return fmt.Errorf("failed to marshal menu for cache: %w", err)
	}

	if err := c.client.Set(ctx, MenuAllKey, data, ttl).Err(); err != nil {
		log.Printf("[Redis Cache Warning] Failed to cache menu: %v", err)
	}
	return nil
}

// InvalidateAll flushes all menu-related cache keys upon an Admin mutation.
func (c *MenuCache) InvalidateAll(ctx context.Context) error {
	if c.client == nil {
		return nil
	}
	err := c.client.Del(ctx, MenuAllKey, MenuCategoriesKey, MenuProductsKey).Err()
	if err != nil {
		log.Printf("[Redis Cache Warning] Failed to invalidate menu cache: %v", err)
		return err
	}
	log.Println("[Redis Cache] Menu cache invalidated successfully.")
	return nil
}
