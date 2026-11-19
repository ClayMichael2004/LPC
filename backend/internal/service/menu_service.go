package service

import (
	"context"
	"fmt"
	"log"
	"time"

	"github.com/littlepolocafe/backend/internal/domain"
	"github.com/littlepolocafe/backend/internal/repository/redis"
	"golang.org/x/sync/errgroup"
	"golang.org/x/sync/singleflight"
)

type ProductCatalog interface {
	GetAllCategories(ctx context.Context) ([]domain.Category, error)
	GetAllProducts(ctx context.Context) ([]domain.Product, error)
	GetProductByID(ctx context.Context, id string) (*domain.Product, error)
	UpdateStock(ctx context.Context, id string, isAvailable *bool, stockQty *int) error
	CreateProduct(ctx context.Context, p *domain.Product) error
	UpdateProduct(ctx context.Context, p *domain.Product) error
	DeleteProduct(ctx context.Context, id string) error
}

type MenuService struct {
	productRepo ProductCatalog
	cache       *redis.MenuCache
	sfGroup     singleflight.Group
}

func NewMenuService(productRepo ProductCatalog, cache *redis.MenuCache) *MenuService {
	return &MenuService{
		productRepo: productRepo,
		cache:       cache,
	}
}

// GetFullMenu implements the Cache-Aside pattern with singleflight stampede protection
// and parallel errgroup PostgreSQL querying on cache miss.
func (s *MenuService) GetFullMenu(ctx context.Context) (*domain.FullMenu, error) {
	// 1. Check Redis Cache
	cachedMenu, err := s.cache.GetFullMenu(ctx)
	if err == nil && cachedMenu != nil {
		return cachedMenu, nil
	}

	// 2. Cache Miss: Coalesce concurrent requests via singleflight to prevent cache stampedes
	val, err, _ := s.sfGroup.Do("full_menu", func() (interface{}, error) {
		// Double-check cache inside singleflight
		if m, err := s.cache.GetFullMenu(ctx); err == nil && m != nil {
			return m, nil
		}

		log.Println("[MenuService] Redis Cache miss. Querying PostgreSQL in parallel...")
		var (
			categories []domain.Category
			products   []domain.Product
		)

		g, gCtx := errgroup.WithContext(ctx)
		g.Go(func() error {
			var cErr error
			categories, cErr = s.productRepo.GetAllCategories(gCtx)
			if cErr != nil {
				return fmt.Errorf("failed to fetch categories: %w", cErr)
			}
			return nil
		})
		g.Go(func() error {
			var pErr error
			products, pErr = s.productRepo.GetAllProducts(gCtx)
			if pErr != nil {
				return fmt.Errorf("failed to fetch products: %w", pErr)
			}
			return nil
		})

		if err := g.Wait(); err != nil {
			return nil, err
		}

		menu := &domain.FullMenu{
			Categories: categories,
			Products:   products,
		}

		// 3. Populate Redis Cache with 1-hour TTL
		_ = s.cache.SetFullMenu(ctx, menu, 1*time.Hour)
		return menu, nil
	})
	if err != nil {
		return nil, err
	}

	return val.(*domain.FullMenu), nil
}

// GetProductByID retrieves a single product by ID.
func (s *MenuService) GetProductByID(ctx context.Context, id string) (*domain.Product, error) {
	return s.productRepo.GetProductByID(ctx, id)
}

// UpdateStock updates item availability and stock count, and purges Redis menu cache.
func (s *MenuService) UpdateStock(ctx context.Context, id string, isAvailable *bool, stockQty *int) error {
	err := s.productRepo.UpdateStock(ctx, id, isAvailable, stockQty)
	if err != nil {
		return err
	}

	// Invalidate Redis cache immediately
	_ = s.cache.InvalidateAll(ctx)
	return nil
}

// CreateProduct creates a new menu product and purges Redis cache.
func (s *MenuService) CreateProduct(ctx context.Context, p *domain.Product) error {
	err := s.productRepo.CreateProduct(ctx, p)
	if err != nil {
		return err
	}
	_ = s.cache.InvalidateAll(ctx)
	return nil
}

// UpdateProduct updates an existing menu product and purges Redis cache.
func (s *MenuService) UpdateProduct(ctx context.Context, p *domain.Product) error {
	err := s.productRepo.UpdateProduct(ctx, p)
	if err != nil {
		return err
	}
	_ = s.cache.InvalidateAll(ctx)
	return nil
}

// DeleteProduct deletes a product and purges Redis cache.
func (s *MenuService) DeleteProduct(ctx context.Context, id string) error {
	err := s.productRepo.DeleteProduct(ctx, id)
	if err != nil {
		return err
	}
	_ = s.cache.InvalidateAll(ctx)
	return nil
}

// GetPromoBanners returns the promotional banners matching the LPC frontend.
func (s *MenuService) GetPromoBanners() []domain.PromoBanner {
	return []domain.PromoBanner{
		{
			ID:       "promo-1",
			Title:    "KENTUCKY TOWN 254",
			Subtitle: "EDITION SPECIALS",
			Image:    "hero-banner-promo.jpg",
		},
		{
			ID:       "promo-2",
			Title:    "LITTLE POLO ARTISAN BREWS",
			Subtitle: "Single Origin Kisumu Roasts & Cold Brews",
			Image:    "hero-promo1.jpg",
		},
		{
			ID:       "promo-3",
			Title:    "SUNSET LAKEFRONT BRUNCH",
			Subtitle: "Fresh Bakes & Gourmet Brioche Melts",
			Image:    "hero-promo2.jpg",
		},
	}
}
