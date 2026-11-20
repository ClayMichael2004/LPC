package postgres

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/littlepolocafe/backend/internal/domain"
)

var ErrProductNotFound = errors.New("product not found")

type ProductRepository struct {
	pool PoolIface
}

func NewProductRepository(pool PoolIface) *ProductRepository {
	return &ProductRepository{pool: pool}
}

func (r *ProductRepository) GetAllCategories(ctx context.Context) ([]domain.Category, error) {
	query := `
		SELECT id, name, image, display_order, created_at, updated_at
		FROM categories
		ORDER BY display_order ASC, name ASC
	`
	rows, err := r.pool.Query(ctx, query)
	if err != nil {
		return nil, fmt.Errorf("failed to query categories: %w", err)
	}
	defer rows.Close()

	var categories []domain.Category
	for rows.Next() {
		var c domain.Category
		var createdAt, updatedAt time.Time
		if err := rows.Scan(&c.ID, &c.Name, &c.Image, &c.DisplayOrder, &createdAt, &updatedAt); err != nil {
			return nil, err
		}
		c.CreatedAt = domain.ToEAT(createdAt)
		c.UpdatedAt = domain.ToEAT(updatedAt)
		categories = append(categories, c)
	}
	return categories, nil
}

func (r *ProductRepository) GetAllProducts(ctx context.Context) ([]domain.Product, error) {
	query := `
		SELECT id, name, category_id, price, description, image, has_options, is_available, stock_quantity, created_at, updated_at
		FROM products
		ORDER BY name ASC
	`
	rows, err := r.pool.Query(ctx, query)
	if err != nil {
		return nil, fmt.Errorf("failed to query products: %w", err)
	}
	defer rows.Close()

	var products []domain.Product
	for rows.Next() {
		var p domain.Product
		var createdAt, updatedAt time.Time
		var desc *string
		if err := rows.Scan(
			&p.ID,
			&p.Name,
			&p.Category,
			&p.Price,
			&desc,
			&p.Image,
			&p.HasOptions,
			&p.IsAvailable,
			&p.StockQuantity,
			&createdAt,
			&updatedAt,
		); err != nil {
			return nil, err
		}
		if desc != nil {
			p.Description = *desc
		}
		p.CreatedAt = domain.ToEAT(createdAt)
		p.UpdatedAt = domain.ToEAT(updatedAt)
		products = append(products, p)
	}
	rows.Close()

	// Fetch option groups and options for products that have them
	for i := range products {
		if products[i].HasOptions {
			grp, err := r.getProductOptionGroup(ctx, products[i].ID)
			if err == nil {
				products[i].OptionsGroup = grp
			}
		}
	}

	return products, nil
}

func (r *ProductRepository) GetProductByID(ctx context.Context, id string) (*domain.Product, error) {
	query := `
		SELECT id, name, category_id, price, description, image, has_options, is_available, stock_quantity, created_at, updated_at
		FROM products
		WHERE id = $1
	`
	var p domain.Product
	var desc *string
	var createdAt, updatedAt time.Time
	err := r.pool.QueryRow(ctx, query, id).Scan(
		&p.ID,
		&p.Name,
		&p.Category,
		&p.Price,
		&desc,
		&p.Image,
		&p.HasOptions,
		&p.IsAvailable,
		&p.StockQuantity,
		&createdAt,
		&updatedAt,
	)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrProductNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("failed to get product by id: %w", err)
	}
	if desc != nil {
		p.Description = *desc
	}
	p.CreatedAt = domain.ToEAT(createdAt)
	p.UpdatedAt = domain.ToEAT(updatedAt)

	if p.HasOptions {
		grp, err := r.getProductOptionGroup(ctx, p.ID)
		if err == nil {
			p.OptionsGroup = grp
		}
	}

	return &p, nil
}

func (r *ProductRepository) getProductOptionGroup(ctx context.Context, productID string) (*domain.ProductOptionGroup, error) {
	query := `
		SELECT id, title, required, min_select, max_select
		FROM product_option_groups
		WHERE product_id = $1
	`
	var grp domain.ProductOptionGroup
	err := r.pool.QueryRow(ctx, query, productID).Scan(
		&grp.ID,
		&grp.Title,
		&grp.Required,
		&grp.Min,
		&grp.Max,
	)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}

	optQuery := `
		SELECT id, option_group_id, name, extra_price
		FROM product_options
		WHERE option_group_id = $1
		ORDER BY extra_price ASC, name ASC
	`
	rows, err := r.pool.Query(ctx, optQuery, grp.ID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	for rows.Next() {
		var opt domain.ProductOption
		if err := rows.Scan(&opt.ID, &opt.OptionGroupID, &opt.Name, &opt.ExtraPrice); err != nil {
			return nil, err
		}
		grp.Options = append(grp.Options, opt)
	}

	return &grp, nil
}

func (r *ProductRepository) UpdateStock(ctx context.Context, id string, isAvailable *bool, stockQuantity *int) error {
	now := time.Now()
	query := `
		UPDATE products
		SET is_available = COALESCE($1, is_available),
		    stock_quantity = CASE 
		        WHEN $1 = true AND COALESCE($2, stock_quantity) <= 0 THEN 999 
		        ELSE COALESCE($2, stock_quantity) 
		    END,
		    updated_at = $3
		WHERE id = $4
	`
	res, err := r.pool.Exec(ctx, query, isAvailable, stockQuantity, now, id)
	if err != nil {
		return fmt.Errorf("failed to update stock: %w", err)
	}
	if res.RowsAffected() == 0 {
		return ErrProductNotFound
	}
	return nil
}

func (r *ProductRepository) CreateProduct(ctx context.Context, p *domain.Product) error {
	now := time.Now()
	if p.IsAvailable && p.StockQuantity <= 0 {
		p.StockQuantity = 999
	}
	query := `
		INSERT INTO products (id, name, category_id, price, description, image, has_options, is_available, stock_quantity, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
	`
	_, err := r.pool.Exec(ctx, query,
		p.ID, p.Name, p.Category, p.Price, p.Description, p.Image, p.HasOptions, p.IsAvailable, p.StockQuantity, now, now,
	)
	if err != nil {
		return err
	}
	p.CreatedAt = domain.ToEAT(now)
	p.UpdatedAt = domain.ToEAT(now)
	return nil
}

func (r *ProductRepository) UpdateProduct(ctx context.Context, p *domain.Product) error {
	now := time.Now()
	if p.IsAvailable && p.StockQuantity <= 0 {
		p.StockQuantity = 999
	}
	query := `
		UPDATE products
		SET name = COALESCE(NULLIF($1, ''), name),
		    category_id = COALESCE(NULLIF($2, ''), category_id),
		    price = CASE WHEN $3 > 0 THEN $3 ELSE price END,
		    description = COALESCE(NULLIF($4, ''), description),
		    image = COALESCE(NULLIF($5, ''), image),
		    is_available = COALESCE($6, is_available),
		    stock_quantity = CASE 
		        WHEN $6 = true AND stock_quantity <= 0 THEN 999 
		        ELSE stock_quantity 
		    END,
		    updated_at = $7
		WHERE id = $8
	`
	res, err := r.pool.Exec(ctx, query,
		p.Name, p.Category, p.Price, p.Description, p.Image, p.IsAvailable, now, p.ID,
	)
	if err != nil {
		return fmt.Errorf("failed to update product: %w", err)
	}
	if res.RowsAffected() == 0 {
		return ErrProductNotFound
	}
	p.UpdatedAt = domain.ToEAT(now)
	return nil
}

func (r *ProductRepository) DeleteProduct(ctx context.Context, id string) error {
	res, err := r.pool.Exec(ctx, "DELETE FROM products WHERE id = $1", id)
	if err != nil {
		return err
	}
	if res.RowsAffected() == 0 {
		return ErrProductNotFound
	}
	return nil
}
