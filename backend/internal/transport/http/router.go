package http

import (
	"time"

	"github.com/gin-gonic/gin"
	"github.com/littlepolocafe/backend/internal/config"
	"github.com/littlepolocafe/backend/internal/domain"
	"github.com/littlepolocafe/backend/internal/middleware"
	"github.com/littlepolocafe/backend/internal/repository/redis"
	"github.com/littlepolocafe/backend/internal/transport/websocket"
	redisclient "github.com/redis/go-redis/v9"
)

type Handlers struct {
	AuthHandler     *AuthHandler
	MenuHandler     *MenuHandler
	OrderHandler    *OrderHandler
	AdminHandler    *AdminHandler
	ActivityHandler *ActivityHandler
	WSHub           *websocket.Hub
	RedisClient     *redisclient.Client
	IdempotencyStore *redis.IdempotencyStore
}

func SetupRouter(cfg *config.Config, h *Handlers) *gin.Engine {
	if cfg.Env == "production" {
		gin.SetMode(gin.ReleaseMode)
	}

	r := gin.New()

	// Global Middlewares
	r.Use(middleware.Recovery())
	r.Use(middleware.CORS())
	r.Use(gin.Logger())

	// Health check
	r.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{
			"status":    "ok",
			"timestamp": domain.NowEAT(),
			"timezone":  "Africa/Nairobi (EAT, UTC+3)",
			"service":   "Little Polo Cafe Backend",
		})
	})

	// WebSockets
	if h.WSHub != nil {
		r.GET("/ws/orders/:id", func(c *gin.Context) {
			websocket.ServeOrderWS(h.WSHub, c)
		})
		r.GET("/ws/admin/orders", func(c *gin.Context) {
			websocket.ServeAdminWS(h.WSHub, c)
		})
	}

	api := r.Group("/api/v1")
	{
		// General API Rate Limit (120 req / minute)
		api.Use(middleware.RateLimit(h.RedisClient, 120, time.Minute))

		// Auth endpoints with strict rate limiting
		authGroup := api.Group("/auth")
		{
			authGroup.POST("/register", h.AuthHandler.Register)
			authGroup.POST("/login", h.AuthHandler.CustomerLogin)
			authGroup.POST("/otp/request", middleware.RateLimit(h.RedisClient, 5, time.Minute), h.AuthHandler.RequestOTP)
			authGroup.POST("/otp/verify", h.AuthHandler.VerifyOTP)
			authGroup.POST("/admin/login", h.AuthHandler.AdminLogin)
		}

		// Menu endpoints (Public & cached in Redis)
		menuGroup := api.Group("/menu")
		{
			menuGroup.GET("", h.MenuHandler.GetFullMenu)
			menuGroup.GET("/promos", h.MenuHandler.GetPromoBanners)
			menuGroup.GET("/products/:id", h.MenuHandler.GetProduct)
		}

		// Activities & Events (Sunday painting, etc.)
		activitiesGroup := api.Group("/activities")
		{
			activitiesGroup.GET("", h.ActivityHandler.GetActivities)
			activitiesGroup.GET("/:id", h.ActivityHandler.GetActivity)
		}

		// Price calculation (Public server-side price calculation endpoint)
		api.POST("/orders/calculate", h.OrderHandler.CalculatePrice)

		// REST Fallback for Live Tracking (Public or Customer)
		api.GET("/orders/:id/tracking", h.OrderHandler.GetOrderTracking)

		// Authenticated Customer & Admin Endpoints
		authRequired := api.Group("")
		authRequired.Use(middleware.AuthMiddleware(cfg.JWTSecret))
		{
			// Profile & Password Reset
			authRequired.GET("/profile", h.AuthHandler.GetProfile)
			authRequired.PUT("/profile", h.AuthHandler.UpdateProfile)
			authRequired.POST("/auth/password/reset", h.AuthHandler.ResetPassword)

			// Customer Orders
			orderRoutes := authRequired.Group("/orders")
			{
				// Place order with Idempotency Key protection
				orderRoutes.POST("", middleware.IdempotencyMiddleware(h.IdempotencyStore), h.OrderHandler.CreateOrder)
				orderRoutes.GET("/my-orders", h.OrderHandler.GetMyOrders)
				orderRoutes.GET("/:id", h.OrderHandler.GetOrder)
			}
		}

		// RBAC Admin Endpoints (Cafe Owner only)
		adminGroup := api.Group("/admin")
		adminGroup.Use(middleware.AuthMiddleware(cfg.JWTSecret))
		adminGroup.Use(middleware.RequireRole(domain.RoleAdmin))
		{
			// Admin Order Management
			adminGroup.GET("/orders", h.AdminHandler.GetAllOrders)
			adminGroup.PATCH("/orders/:id/status", h.AdminHandler.UpdateOrderStatus)
			adminGroup.POST("/orders/:id/dispatch", h.AdminHandler.DispatchCourier)
			adminGroup.POST("/orders/:id/location", h.AdminHandler.UpdateCourierLocation)
			adminGroup.GET("/stats", h.AdminHandler.GetAdminStats)

			// Admin Menu & Stock Management (Purges Redis cache)
			adminGroup.PATCH("/menu/products/:id/stock", h.AdminHandler.UpdateStock)
			adminGroup.POST("/menu/products", h.AdminHandler.CreateProduct)
			adminGroup.DELETE("/menu/products/:id", h.AdminHandler.DeleteProduct)
		}
	}

	return r
}
