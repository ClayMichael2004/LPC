package postgres

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/littlepolocafe/backend/internal/domain"
)

var ErrUserNotFound = errors.New("user not found")

type UserRepository struct {
	pool PoolIface
}

func NewUserRepository(pool PoolIface) *UserRepository {
	return &UserRepository{pool: pool}
}

func (r *UserRepository) Create(ctx context.Context, u *domain.User) error {
	query := `
		INSERT INTO users (id, name, initials, phone, email, password_hash, role, dob, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
	`
	now := time.Now()
	_, err := r.pool.Exec(ctx, query,
		u.ID,
		u.Name,
		u.Initials,
		u.Phone,
		u.Email,
		u.PasswordHash,
		u.Role,
		u.DateOfBirth,
		now,
		now,
	)
	if err != nil {
		return fmt.Errorf("failed to create user: %w", err)
	}
	u.CreatedAt = domain.ToEAT(now)
	u.UpdatedAt = domain.ToEAT(now)
	return nil
}

func (r *UserRepository) GetByID(ctx context.Context, id string) (*domain.User, error) {
	query := `
		SELECT id, name, initials, phone, email, COALESCE(password_hash, ''), role, dob, created_at, updated_at
		FROM users
		WHERE id = $1
	`
	var u domain.User
	var createdAt, updatedAt time.Time
	err := r.pool.QueryRow(ctx, query, id).Scan(
		&u.ID,
		&u.Name,
		&u.Initials,
		&u.Phone,
		&u.Email,
		&u.PasswordHash,
		&u.Role,
		&u.DateOfBirth,
		&createdAt,
		&updatedAt,
	)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrUserNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("failed to get user by id: %w", err)
	}
	u.CreatedAt = domain.ToEAT(createdAt)
	u.UpdatedAt = domain.ToEAT(updatedAt)
	return &u, nil
}

func (r *UserRepository) GetByPhone(ctx context.Context, phone string) (*domain.User, error) {
	query := `
		SELECT id, name, initials, phone, email, COALESCE(password_hash, ''), role, dob, created_at, updated_at
		FROM users
		WHERE phone = $1
	`
	var u domain.User
	var createdAt, updatedAt time.Time
	err := r.pool.QueryRow(ctx, query, phone).Scan(
		&u.ID,
		&u.Name,
		&u.Initials,
		&u.Phone,
		&u.Email,
		&u.PasswordHash,
		&u.Role,
		&u.DateOfBirth,
		&createdAt,
		&updatedAt,
	)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrUserNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("failed to get user by phone: %w", err)
	}
	u.CreatedAt = domain.ToEAT(createdAt)
	u.UpdatedAt = domain.ToEAT(updatedAt)
	return &u, nil
}

func (r *UserRepository) GetByEmail(ctx context.Context, email string) (*domain.User, error) {
	query := `
		SELECT id, name, initials, phone, email, COALESCE(password_hash, ''), role, dob, created_at, updated_at
		FROM users
		WHERE email = $1
	`
	var u domain.User
	var createdAt, updatedAt time.Time
	err := r.pool.QueryRow(ctx, query, email).Scan(
		&u.ID,
		&u.Name,
		&u.Initials,
		&u.Phone,
		&u.Email,
		&u.PasswordHash,
		&u.Role,
		&u.DateOfBirth,
		&createdAt,
		&updatedAt,
	)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrUserNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("failed to get user by email: %w", err)
	}
	u.CreatedAt = domain.ToEAT(createdAt)
	u.UpdatedAt = domain.ToEAT(updatedAt)
	return &u, nil
}

func (r *UserRepository) Update(ctx context.Context, u *domain.User) error {
	query := `
		UPDATE users
		SET name = $1, initials = $2, phone = $3, email = $4, dob = $5, updated_at = $6
		WHERE id = $7
	`
	now := time.Now()
	res, err := r.pool.Exec(ctx, query,
		u.Name,
		u.Initials,
		u.Phone,
		u.Email,
		u.DateOfBirth,
		now,
		u.ID,
	)
	if err != nil {
		return fmt.Errorf("failed to update user: %w", err)
	}
	if res.RowsAffected() == 0 {
		return ErrUserNotFound
	}
	u.UpdatedAt = domain.ToEAT(now)
	return nil
}
