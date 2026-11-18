package http

import (
	"errors"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/littlepolocafe/backend/internal/domain"
	"github.com/littlepolocafe/backend/internal/middleware"
	"github.com/littlepolocafe/backend/internal/repository/postgres"
	"github.com/littlepolocafe/backend/internal/service"
)

type OrderHandler struct {
	orderService   *service.OrderService
	pricingService *service.PricingService
}

func NewOrderHandler(orderService *service.OrderService, pricingService *service.PricingService) *OrderHandler {
	return &OrderHandler{
		orderService:   orderService,
		pricingService: pricingService,
	}
}

// CalculatePrice calculates prices strictly server-side.
func (h *OrderHandler) CalculatePrice(c *gin.Context) {
	var req domain.PriceCalculationRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		JSONError(c, http.StatusBadRequest, "Invalid price calculation request. Items array is required.")
		return
	}

	summary, err := h.pricingService.CalculatePrice(c.Request.Context(), req.Items, req.DeliveryType)
	if err != nil {
		JSONError(c, http.StatusBadRequest, "Price calculation error: "+err.Error())
		return
	}

	JSONSuccess(c, http.StatusOK, summary)
}

// CreateOrder places a new order atomically in PostgreSQL.
// Out-of-stock guards and idempotency keys are strictly enforced.
func (h *OrderHandler) CreateOrder(c *gin.Context) {
	userID := c.GetString(middleware.ContextKeyUserID)
	if userID == "" {
		JSONError(c, http.StatusUnauthorized, "Authentication required to place order")
		return
	}

	var req domain.CreateOrderRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		JSONError(c, http.StatusBadRequest, "Invalid order request. Items and delivery details are required.")
		return
	}

	var idempotencyKeyPtr *string
	keyHeader := c.GetHeader("Idempotency-Key")
	if keyHeader != "" {
		idempotencyKeyPtr = &keyHeader
	}

	order, err := h.orderService.CreateOrder(c.Request.Context(), userID, &req, idempotencyKeyPtr)
	if err != nil {
		var oosErr postgres.OutOfStockError
		if errors.As(err, &oosErr) {
			JSONError(c, http.StatusConflict, oosErr.Error())
			return
		}
		var unavailErr postgres.UnavailableProductError
		if errors.As(err, &unavailErr) {
			JSONError(c, http.StatusConflict, unavailErr.Error())
			return
		}
		JSONError(c, http.StatusBadRequest, "Failed to place order: "+err.Error())
		return
	}

	JSONSuccess(c, http.StatusCreated, order)
}

// GetMyOrders returns the order history for the current authenticated customer.
func (h *OrderHandler) GetMyOrders(c *gin.Context) {
	userID := c.GetString(middleware.ContextKeyUserID)
	orders, err := h.orderService.GetUserOrders(c.Request.Context(), userID)
	if err != nil {
		JSONError(c, http.StatusInternalServerError, "Failed to fetch orders: "+err.Error())
		return
	}

	if orders == nil {
		orders = []domain.Order{}
	}

	JSONSuccess(c, http.StatusOK, orders)
}

// GetOrder returns a single order by ID.
func (h *OrderHandler) GetOrder(c *gin.Context) {
	id := c.Param("id")
	userID := c.GetString(middleware.ContextKeyUserID)
	userRole := c.GetString(middleware.ContextKeyRole)

	order, err := h.orderService.GetOrderByID(c.Request.Context(), id)
	if err != nil {
		if errors.Is(err, postgres.ErrOrderNotFound) {
			JSONError(c, http.StatusNotFound, "Order not found")
			return
		}
		JSONError(c, http.StatusInternalServerError, "Failed to fetch order: "+err.Error())
		return
	}

	// RBAC customer check: customer may only view their own orders
	if userRole != domain.RoleAdmin && order.UserID != userID {
		JSONError(c, http.StatusForbidden, "You do not have access to view this order")
		return
	}

	JSONSuccess(c, http.StatusOK, order)
}

// GetOrderTracking provides the REST fallback for real-time tracking, strictly scoped to the order owner or Admin.
func (h *OrderHandler) GetOrderTracking(c *gin.Context) {
	id := c.Param("id")
	userID := c.GetString(middleware.ContextKeyUserID)
	userRole := c.GetString(middleware.ContextKeyRole)

	order, err := h.orderService.GetOrderByID(c.Request.Context(), id)
	if err != nil {
		if errors.Is(err, postgres.ErrOrderNotFound) {
			JSONError(c, http.StatusNotFound, "Order not found")
			return
		}
		JSONError(c, http.StatusInternalServerError, "Failed to fetch order: "+err.Error())
		return
	}

	// Strict ownership check: customer may only view tracking for their own orders
	if userRole != domain.RoleAdmin && order.UserID != userID {
		JSONError(c, http.StatusForbidden, "You do not have access to view tracking for this order")
		return
	}

	tracking, err := h.orderService.GetOrderTracking(c.Request.Context(), id)
	if err != nil {
		if errors.Is(err, postgres.ErrOrderNotFound) {
			JSONError(c, http.StatusNotFound, "Order not found")
			return
		}
		JSONError(c, http.StatusInternalServerError, "Failed to fetch tracking: "+err.Error())
		return
	}

	JSONSuccess(c, http.StatusOK, tracking)
}
