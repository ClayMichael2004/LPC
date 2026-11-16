package redis_test

import (
	"context"
	"testing"
	"time"

	"github.com/alicebob/miniredis/v2"
	"github.com/littlepolocafe/backend/internal/domain"
	"github.com/littlepolocafe/backend/internal/repository/redis"
	redisclient "github.com/redis/go-redis/v9"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestMenuCache_CacheAsideWorkflow(t *testing.T) {
	mr := miniredis.RunT(t)
	rdb := redisclient.NewClient(&redisclient.Options{Addr: mr.Addr()})
	cache := redis.NewMenuCache(rdb)

	ctx := context.Background()

	// 1. Initial Cache Miss
	cached, err := cache.GetFullMenu(ctx)
	require.NoError(t, err)
	assert.Nil(t, cached, "Cache should be empty initially")

	// 2. Set Menu Cache
	sampleMenu := &domain.FullMenu{
		Categories: []domain.Category{
			{ID: "burgers", Name: "Polo Burgers", Image: "cat-grid-1.png", DisplayOrder: 1},
			{ID: "artisan-coffee", Name: "Artisan Coffee", Image: "cold-brew.jpg", DisplayOrder: 2},
		},
		Products: []domain.Product{
			{ID: "big-boss-burger", Name: "Big Boss Burger", Price: 850.00, Category: "burgers"},
		},
	}

	err = cache.SetFullMenu(ctx, sampleMenu, 1*time.Hour)
	require.NoError(t, err)

	// 3. Cache Hit
	cached, err = cache.GetFullMenu(ctx)
	require.NoError(t, err)
	require.NotNil(t, cached)
	assert.Len(t, cached.Categories, 2)
	assert.Equal(t, "Polo Burgers", cached.Categories[0].Name)
	assert.Len(t, cached.Products, 1)
	assert.Equal(t, "Big Boss Burger", cached.Products[0].Name)

	// 4. Invalidation upon Admin mutation
	err = cache.InvalidateAll(ctx)
	require.NoError(t, err)

	// 5. Subsequent read is a cache miss
	cachedAfterInvalidation, err := cache.GetFullMenu(ctx)
	require.NoError(t, err)
	assert.Nil(t, cachedAfterInvalidation, "Cache must be empty after InvalidateAll")
}
