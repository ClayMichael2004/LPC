package main

import (
	"context"
	"log"
	"os"
	"time"

	"github.com/littlepolocafe/backend/internal/config"
	"github.com/littlepolocafe/backend/internal/repository/postgres"
)

func main() {
	cfg := config.Load()
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	log.Println("[Seed CLI] Connecting to PostgreSQL...")
	db, err := postgres.Connect(ctx, cfg.DatabaseURL)
	if err != nil {
		log.Fatalf("[Seed CLI Error] Connection failed: %v", err)
	}
	defer db.Close()

	migrationFile, err := os.ReadFile("migrations/001_init_schema.up.sql")
	if err == nil {
		if err := db.RunMigrations(ctx, string(migrationFile)); err != nil {
			log.Fatalf("[Seed CLI Error] Migration failed: %v", err)
		}
	}

	if err := postgres.SeedDatabase(ctx, db.Pool); err != nil {
		log.Fatalf("[Seed CLI Error] Seeding failed: %v", err)
	}

	log.Println("[Seed CLI] Database successfully migrated and seeded!")
}
