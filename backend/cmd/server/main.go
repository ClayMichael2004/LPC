package main

import (
	"context"
	"errors"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/littlepolocafe/backend/internal/config"
	"github.com/littlepolocafe/backend/internal/domain"
	"github.com/littlepolocafe/backend/internal/repository/memory"
	"github.com/littlepolocafe/backend/internal/repository/postgres"
	"github.com/littlepolocafe/backend/internal/repository/redis"
	"github.com/littlepolocafe/backend/internal/service"
	httptransport "github.com/littlepolocafe/backend/internal/transport/http"
	"github.com/littlepolocafe/backend/internal/transport/websocket"
)

func main() {
	log.Println("==================================================================")
	log.Println("   ☕ Little Polo Cafe (LPC) Backend API Server Starting...")
	log.Println("   Timezone: East Africa Time (EAT, UTC+3) · Kisumu, Kenya")
	log.Println("==================================================================")

	// 1. Load Configuration
	cfg := config.Load()

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	// 2. Connect to PostgreSQL
	db, err := postgres.Connect(ctx, cfg.DatabaseURL)
	if err != nil {
		log.Printf("[PostgreSQL Warning] Could not connect to PostgreSQL: %v", err)
		log.Println("[PostgreSQL Warning] Backend will proceed in mock/demo fallback mode.")
	} else {
		defer db.Close()

		// Run automated schema migration
		migrationFile, err := os.ReadFile("migrations/001_init_schema.up.sql")
		if err == nil {
			_ = db.RunMigrations(ctx, string(migrationFile))
		}
		// Seed database
		_ = postgres.SeedDatabase(ctx, db.Pool)
	}

	// 3. Connect to Redis
	redisClient, err := redis.Connect(ctx, cfg.RedisURL, cfg.RedisPassword)
	if err != nil {
		log.Printf("[Redis Warning] Could not connect to Redis: %v. Using in-memory fallback.", err)
	} else {
		defer redisClient.Close()
	}

	var rdb = (*redis.Client)(nil)
	if redisClient != nil {
		rdb = redisClient
	}

	// 4. Initialize Repositories (PostgreSQL with In-Memory Resilient Fallback)
	var userRepo service.UserStore
	var productCatalog service.ProductCatalog
	var orderRepo service.OrderStore
	var activityReader httptransport.ActivityReader

	if db != nil {
		userRepo = postgres.NewUserRepository(db.Pool)
		productCatalog = postgres.NewProductRepository(db.Pool)
		orderRepo = postgres.NewOrderRepository(db.Pool)
		activityReader = postgres.NewActivityRepository(db.Pool)
	} else {
		log.Println("[Fallback Engine] Initializing in-memory Little Polo Cafe store...")
		memUser := memory.NewMemoryUserRepo()
		memProduct := memory.NewMemoryProductRepo()
		memOrder := memory.NewMemoryOrderRepo(memProduct)
		memActivity := memory.NewMemoryActivityRepo()

		userRepo = memUser
		productCatalog = memProduct
		orderRepo = memOrder
		activityReader = memActivity
	}

	var menuCache *redis.MenuCache
	var idempotencyStore *redis.IdempotencyStore
	if rdb != nil && rdb.RDB != nil {
		menuCache = redis.NewMenuCache(rdb.RDB)
		idempotencyStore = redis.NewIdempotencyStore(rdb.RDB)
	} else {
		menuCache = redis.NewMenuCache(nil)
		idempotencyStore = redis.NewIdempotencyStore(nil)
	}

	// 5. Initialize Gorilla WebSocket Hub
	var wsHub *websocket.Hub
	if redisClient != nil {
		wsHub = websocket.NewHub(redisClient.RDB)
	} else {
		wsHub = websocket.NewHub(nil)
	}
	go wsHub.Run(ctx)

	// 6. Initialize Services
	emailService := service.NewEmailService(cfg)
	var authService *service.AuthService
	if redisClient != nil {
		authService = service.NewAuthService(cfg, userRepo, emailService, redisClient.RDB)
	} else {
		authService = service.NewAuthService(cfg, userRepo, emailService, nil)
	}
	pricingService := service.NewPricingService(productCatalog)
	menuService := service.NewMenuService(productCatalog, menuCache)
	orderService := service.NewOrderService(orderRepo, pricingService, wsHub)
	adminService := service.NewAdminService(userRepo, emailService, menuService, activityReader)
	if db != nil && db.Pool != nil {
		adminService.SetPool(db.Pool)
	}

	// Operational notifications triggers
	authService.SetOnNewRegistration(func(u *domain.User) {
		adminService.AddOperationalNotification("registration", "New Customer Registered", fmt.Sprintf("%s (%s) joined Little Polo Cafe", u.Name, u.Email))
	})
	orderService.SetOnNewOrder(func(o *domain.Order) {
		adminService.AddOperationalNotification("order", fmt.Sprintf("New Order #%s", o.ID), fmt.Sprintf("Order placed for KES %.0f (%d items) to %s", o.Total, len(o.Items), o.DeliveryInfo.AddressName))
	})

	// 7. Initialize Handlers
	authHandler := httptransport.NewAuthHandler(authService, userRepo)
	menuHandler := httptransport.NewMenuHandler(menuService)
	orderHandler := httptransport.NewOrderHandler(orderService, pricingService)
	adminHandler := httptransport.NewAdminHandler(orderService, menuService, adminService)
	activityHandler := httptransport.NewActivityHandler(activityReader)

	handlers := &httptransport.Handlers{
		AuthHandler:      authHandler,
		MenuHandler:      menuHandler,
		OrderHandler:     orderHandler,
		AdminHandler:     adminHandler,
		ActivityHandler:  activityHandler,
		WSHub:            wsHub,
		IdempotencyStore: idempotencyStore,
	}
	if redisClient != nil {
		handlers.RedisClient = redisClient.RDB
	}

	// 8. Setup Router
	router := httptransport.SetupRouter(cfg, handlers)

	srv := &http.Server{
		Addr:         ":" + cfg.Port,
		Handler:      router,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	// 9. Start Server in Goroutine
	go func() {
		log.Printf("[HTTP Server] Listening on port %s (http://localhost:%s)", cfg.Port, cfg.Port)
		if err := srv.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			log.Fatalf("[HTTP Server Error] Listen failed: %v", err)
		}
	}()

	// 10. Graceful Shutdown
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit
	log.Println("[HTTP Server] Shutting down gracefully...")

	shutdownCtx, shutdownCancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer shutdownCancel()

	if err := srv.Shutdown(shutdownCtx); err != nil {
		log.Fatalf("[HTTP Server Error] Server forced to shutdown: %v", err)
	}

	log.Println("[HTTP Server] Little Polo Cafe backend exited cleanly.")
}
