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

// Connect initializes a connection pool to PostgreSQL.
func Connect(ctx context.Context, databaseURL string) (*DB, error) {
	cfg, err := pgxpool.ParseConfig(databaseURL)
	if err != nil {
		return nil, fmt.Errorf("failed to parse database config: %w", err)
	}

	cfg.MaxConns = 25
	cfg.MinConns = 5
	cfg.MaxConnLifetime = 1 * time.Hour
	cfg.MaxConnIdleTime = 15 * time.Minute

	pool, err := pgxpool.NewWithConfig(ctx, cfg)
	if err != nil {
		return nil, fmt.Errorf("failed to create pgxpool: %w", err)
	}

	pingCtx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	if err := pool.Ping(pingCtx); err != nil {
		pool.Close()
		return nil, fmt.Errorf("failed to ping postgres database: %w", err)
	}

	log.Printf("[PostgreSQL] Connected successfully to %s", cfg.ConnConfig.Database)
	return &DB{Pool: pool}, nil
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
