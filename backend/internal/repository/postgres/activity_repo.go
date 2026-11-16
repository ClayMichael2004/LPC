package postgres

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/littlepolocafe/backend/internal/domain"
)

var ErrActivityNotFound = errors.New("activity not found")

type ActivityRepository struct {
	pool PoolIface
}

func NewActivityRepository(pool PoolIface) *ActivityRepository {
	return &ActivityRepository{pool: pool}
}

func (r *ActivityRepository) GetAllActivities(ctx context.Context) ([]domain.Activity, error) {
	query := `
		SELECT id, title, subtitle, schedule, price, location, whatsapp_number, image, is_active, created_at, updated_at
		FROM activities
		WHERE is_active = TRUE
		ORDER BY created_at ASC
	`
	rows, err := r.pool.Query(ctx, query)
	if err != nil {
		return nil, fmt.Errorf("failed to query activities: %w", err)
	}
	defer rows.Close()

	var activities []domain.Activity
	for rows.Next() {
		var a domain.Activity
		var createdAt, updatedAt time.Time
		if err := rows.Scan(
			&a.ID,
			&a.Title,
			&a.Subtitle,
			&a.Schedule,
			&a.Price,
			&a.Location,
			&a.WhatsAppNumber,
			&a.Image,
			&a.IsActive,
			&createdAt,
			&updatedAt,
		); err != nil {
			return nil, err
		}
		a.CreatedAt = domain.ToEAT(createdAt)
		a.UpdatedAt = domain.ToEAT(updatedAt)
		activities = append(activities, a)
	}
	return activities, nil
}

func (r *ActivityRepository) GetActivityByID(ctx context.Context, id string) (*domain.Activity, error) {
	query := `
		SELECT id, title, subtitle, schedule, price, location, whatsapp_number, image, is_active, created_at, updated_at
		FROM activities
		WHERE id = $1
	`
	var a domain.Activity
	var createdAt, updatedAt time.Time
	err := r.pool.QueryRow(ctx, query, id).Scan(
		&a.ID,
		&a.Title,
		&a.Subtitle,
		&a.Schedule,
		&a.Price,
		&a.Location,
		&a.WhatsAppNumber,
		&a.Image,
		&a.IsActive,
		&createdAt,
		&updatedAt,
	)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrActivityNotFound
	}
	if err != nil {
		return nil, err
	}
	a.CreatedAt = domain.ToEAT(createdAt)
	a.UpdatedAt = domain.ToEAT(updatedAt)
	return &a, nil
}
