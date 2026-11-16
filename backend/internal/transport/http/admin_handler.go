package http

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/littlepolocafe/backend/internal/domain"
	"github.com/littlepolocafe/backend/internal/service"
)

type AdminHandler struct {
	orderService *service.OrderService
	menuService  *service.MenuService
}

func NewAdminHandler(orderService *service.OrderService, menuService *service.MenuService) *AdminHandler {
	return &AdminHandler{
		orderService: orderService,
		menuService:  menuService,
	}
}

// GetAllOrders lists all orders for cafe owner management.
func (h *AdminHandler) GetAllOrders(c *gin.Context) {
	statusQuery := c.Query("status")
	var statusFilter *domain.OrderStatus
	if statusQuery != "" {
		st := domain.OrderStatus(statusQuery)
		statusFilter = &st
	}

	orders, err := h.orderService.GetAllOrders(c.Request.Context(), statusFilter)
	if err != nil {
		JSONError(c, http.StatusInternalServerError, "Failed to load orders: "+err.Error())
		return
	}

	if orders == nil {
		orders = []domain.Order{}
	}

	JSONSuccess(c, http.StatusOK, orders)
}

// UpdateOrderStatus advances the order lifecycle and broadcasts via WebSocket.
func (h *AdminHandler) UpdateOrderStatus(c *gin.Context) {
	id := c.Param("id")
	var req domain.UpdateOrderStatusRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		JSONError(c, http.StatusBadRequest, "Status is required (e.g. CONFIRMED, PREPARING, OUT_FOR_DELIVERY, DELIVERED)")
		return
	}

	tracking, err := h.orderService.AdvanceOrderStatus(c.Request.Context(), id, req.Status)
	if err != nil {
		JSONError(c, http.StatusInternalServerError, "Failed to update order status: "+err.Error())
		return
	}

	JSONSuccess(c, http.StatusOK, tracking)
}

// DispatchCourier assigns courier contact and dispatches delivery.
func (h *AdminHandler) DispatchCourier(c *gin.Context) {
	id := c.Param("id")
	var req domain.DispatchCourierRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		JSONError(c, http.StatusBadRequest, "Courier name and phone are required")
		return
	}

	tracking, err := h.orderService.DispatchCourier(c.Request.Context(), id, &req)
	if err != nil {
		JSONError(c, http.StatusInternalServerError, "Failed to dispatch courier: "+err.Error())
		return
	}

	JSONSuccess(c, http.StatusOK, tracking)
}

// UpdateCourierLocation pushes live GPS coordinates for courier tracking.
func (h *AdminHandler) UpdateCourierLocation(c *gin.Context) {
	id := c.Param("id")
	var req domain.UpdateLocationRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		JSONError(c, http.StatusBadRequest, "Lat and Lng are required")
		return
	}

	err := h.orderService.UpdateLocation(c.Request.Context(), id, req.Lat, req.Lng)
	if err != nil {
		JSONError(c, http.StatusInternalServerError, "Failed to update location: "+err.Error())
		return
	}

	JSONMessage(c, http.StatusOK, "Courier location updated successfully")
}

// UpdateStock updates item availability and inventory count.
func (h *AdminHandler) UpdateStock(c *gin.Context) {
	id := c.Param("id")
	var req domain.UpdateStockRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		JSONError(c, http.StatusBadRequest, "Invalid stock update payload")
		return
	}

	err := h.menuService.UpdateStock(c.Request.Context(), id, req.IsAvailable, req.StockQuantity)
	if err != nil {
		JSONError(c, http.StatusInternalServerError, "Failed to update stock: "+err.Error())
		return
	}

	JSONMessage(c, http.StatusOK, "Stock and availability updated successfully. Cache invalidated.")
}

// CreateProduct adds a new item to the menu.
func (h *AdminHandler) CreateProduct(c *gin.Context) {
	var p domain.Product
	if err := c.ShouldBindJSON(&p); err != nil {
		JSONError(c, http.StatusBadRequest, "Invalid product payload")
		return
	}

	err := h.menuService.CreateProduct(c.Request.Context(), &p)
	if err != nil {
		JSONError(c, http.StatusInternalServerError, "Failed to create product: "+err.Error())
		return
	}

	JSONSuccess(c, http.StatusCreated, p)
}

// DeleteProduct removes an item from the menu.
func (h *AdminHandler) DeleteProduct(c *gin.Context) {
	id := c.Param("id")
	err := h.menuService.DeleteProduct(c.Request.Context(), id)
	if err != nil {
		JSONError(c, http.StatusInternalServerError, "Failed to delete product: "+err.Error())
		return
	}

	JSONMessage(c, http.StatusOK, "Product deleted successfully")
}

// GetAdminStats returns summary metrics for the cafe owner dashboard.
func (h *AdminHandler) GetAdminStats(c *gin.Context) {
	orders, err := h.orderService.GetAllOrders(c.Request.Context(), nil)
	if err != nil {
		JSONError(c, http.StatusInternalServerError, "Failed to load stats: "+err.Error())
		return
	}

	var totalRevenue float64
	var pendingCount, preparingCount, dispatchedCount, deliveredCount int

	for _, o := range orders {
		totalRevenue += o.Total
		switch o.Status {
		case domain.OrderStatusPending:
			pendingCount++
		case domain.OrderStatusPreparing:
			preparingCount++
		case domain.OrderStatusOutForDelivery:
			dispatchedCount++
		case domain.OrderStatusDelivered:
			deliveredCount++
		}
	}

	stats := gin.H{
		"totalOrders":     len(orders),
		"totalRevenueKES": totalRevenue,
		"pendingOrders":   pendingCount,
		"preparingOrders": preparingCount,
		"activeCouriers":  dispatchedCount,
		"completedOrders": deliveredCount,
	}

	JSONSuccess(c, http.StatusOK, stats)
}
