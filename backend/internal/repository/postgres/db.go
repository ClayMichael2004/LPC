package postgres

import (
	"context"
	"fmt"
	"log"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
)

// PoolIface defines the database pool methods required by repositories,
// allowing both real *pgxpool.Pool and pgxmock.PgxPoolIface to be used.
type PoolIface interface {
	Begin(ctx context.Context) (pgx.Tx, error)
	Exec(ctx context.Context, sql string, arguments ...any) (pgconn.CommandTag, error)
	Query(ctx context.Context, sql string, args ...any) (pgx.Rows, error)
	QueryRow(ctx context.Context, sql string, args ...any) pgx.Row
	Close()
}

// DB holds the connection pool.
type DB struct {
	Pool *pgxpool.Pool
}

// Connect initializes a connection pool to PostgreSQL with resilient retry logic.
func Connect(ctx context.Context, databaseURL string) (*DB, error) {
	cfg, err := pgxpool.ParseConfig(databaseURL)
	if err != nil {
		return nil, fmt.Errorf("failed to parse database config: %w", err)
	}

	cfg.MaxConns = 25
	cfg.MinConns = 5
	cfg.MaxConnLifetime = 1 * time.Hour
	cfg.MaxConnIdleTime = 15 * time.Minute

	var pool *pgxpool.Pool
	var lastErr error

	// Retry loop: up to 10 attempts (total ~20s) to allow PostgreSQL container to finish initializing
	for attempt := 1; attempt <= 10; attempt++ {
		select {
		case <-ctx.Done():
			return nil, ctx.Err()
		default:
		}

		pool, err = pgxpool.NewWithConfig(ctx, cfg)
		if err == nil {
			pingCtx, cancel := context.WithTimeout(ctx, 3*time.Second)
			err = pool.Ping(pingCtx)
			cancel()
			if err == nil {
				log.Printf("[PostgreSQL] Connected successfully to %s on attempt %d", cfg.ConnConfig.Database, attempt)
				return &DB{Pool: pool}, nil
			}
			pool.Close()
		}

		lastErr = err
		log.Printf("[PostgreSQL] Connection attempt %d/10 failed (%v), retrying in 2s...", attempt, err)
		time.Sleep(2 * time.Second)
	}

	return nil, fmt.Errorf("failed to connect to postgres after 10 attempts: %w", lastErr)
}

// Close gracefully closes all database connections.
func (db *DB) Close() {
	if db.Pool != nil {
		db.Pool.Close()
	}
}

// RunMigrations executes initial SQL migration scripts.
func (db *DB) RunMigrations(ctx context.Context, migrationSQL string) error {
	_, err := db.Pool.Exec(ctx, migrationSQL)
	if err != nil {
		return fmt.Errorf("migration failed: %w", err)
	}
	log.Println("[PostgreSQL] Schema migrations applied successfully.")
	return nil
}
