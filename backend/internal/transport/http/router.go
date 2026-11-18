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
			menuGroup.GET("/specials", h.AdminHandler.GetSpecials)
			menuGroup.GET("/products/:id", h.MenuHandler.GetProduct)
		}

		// Activities & Events (Sunday painting, etc.)
		activitiesGroup := api.Group("/activities")
		{
			activitiesGroup.GET("", h.ActivityHandler.GetActivities)
			activitiesGroup.GET("/gallery", h.AdminHandler.GetGallery)
			activitiesGroup.GET("/:id", h.ActivityHandler.GetActivity)
		}

		// Price calculation (Public server-side price calculation endpoint)
		api.POST("/orders/calculate", h.OrderHandler.CalculatePrice)

		// Authenticated Customer & Admin Endpoints (Enforces Single Active Device Session)
		var sessionValidator middleware.SessionValidatorFunc
		if h.AuthHandler != nil {
			sessionValidator = h.AuthHandler.ValidateSession
		}

		authRequired := api.Group("")
		authRequired.Use(middleware.AuthMiddleware(cfg.JWTSecret, sessionValidator))
		{
			// Profile, Password Reset & Logout
			authRequired.GET("/profile", h.AuthHandler.GetProfile)
			authRequired.PUT("/profile", h.AuthHandler.UpdateProfile)
			authRequired.POST("/auth/password/reset", h.AuthHandler.ResetPassword)
			authRequired.POST("/auth/logout", h.AuthHandler.Logout)

			// Customer Orders (Strictly isolated to the authenticated customer)
			orderRoutes := authRequired.Group("/orders")
			{
				// Place order with Idempotency Key protection
				orderRoutes.POST("", middleware.IdempotencyMiddleware(h.IdempotencyStore), h.OrderHandler.CreateOrder)
				orderRoutes.GET("/my-orders", h.OrderHandler.GetMyOrders)
				orderRoutes.GET("/:id", h.OrderHandler.GetOrder)
				orderRoutes.GET("/:id/tracking", h.OrderHandler.GetOrderTracking)
			}
		}

		// RBAC Admin Endpoints (Cafe Owner only)
		adminGroup := api.Group("/admin")
		adminGroup.Use(middleware.AuthMiddleware(cfg.JWTSecret, sessionValidator))
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

			// Admin Specials & Features
			adminGroup.POST("/menu/specials", h.AdminHandler.CreateSpecial)
			adminGroup.DELETE("/menu/specials/:id", h.AdminHandler.DeleteSpecial)

			// Admin Activities & Gallery
			adminGroup.POST("/activities", h.AdminHandler.CreateActivity)
			adminGroup.PUT("/activities/:id", h.AdminHandler.UpdateActivity)
			adminGroup.DELETE("/activities/:id", h.AdminHandler.DeleteActivity)
			adminGroup.POST("/activities/gallery", h.AdminHandler.AddGalleryPhoto)
			adminGroup.DELETE("/activities/gallery/:id", h.AdminHandler.DeleteGalleryPhoto)

			// Admin Bulk Communications
			adminGroup.GET("/communications/audience", h.AdminHandler.GetAudience)
			adminGroup.POST("/communications/send", h.AdminHandler.SendBroadcast)
			adminGroup.GET("/communications/logs", h.AdminHandler.GetBroadcastLogs)

			// Admin Operational Notifications
			adminGroup.GET("/notifications", h.AdminHandler.GetAdminNotifications)
			adminGroup.PATCH("/notifications/:id/read", h.AdminHandler.MarkNotificationRead)
		}
	}

	return r
}
