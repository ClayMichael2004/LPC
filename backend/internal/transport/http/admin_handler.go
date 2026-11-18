package http

import (
	"net/http"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/littlepolocafe/backend/internal/domain"
	"github.com/littlepolocafe/backend/internal/service"
)

type AdminHandler struct {
	orderService *service.OrderService
	menuService  *service.MenuService
	adminService *service.AdminService
}

func NewAdminHandler(
	orderService *service.OrderService,
	menuService *service.MenuService,
	adminService *service.AdminService,
) *AdminHandler {
	return &AdminHandler{
		orderService: orderService,
		menuService:  menuService,
		adminService: adminService,
	}
}

// GetAllOrders lists all orders for cafe owner management with search, filter, and pagination.
func (h *AdminHandler) GetAllOrders(c *gin.Context) {
	statusQuery := strings.TrimSpace(c.Query("status"))
	searchQuery := strings.ToLower(strings.TrimSpace(c.Query("search")))

	var statusFilter *domain.OrderStatus
	if statusQuery != "" && statusQuery != "all" {
		st := domain.OrderStatus(strings.ToUpper(statusQuery))
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

	// Filter by search query if provided
	var filtered []domain.Order
	for _, o := range orders {
		if searchQuery != "" {
			matches := strings.Contains(strings.ToLower(o.ID), searchQuery) ||
				strings.Contains(strings.ToLower(o.DeliveryInfo.AddressName), searchQuery) ||
				strings.Contains(strings.ToLower(o.DeliveryInfo.Phone), searchQuery) ||
				strings.Contains(strings.ToLower(o.DeliveryInfo.EstateBuilding), searchQuery)
			if !matches {
				continue
			}
		}
		filtered = append(filtered, o)
	}

	// Calculate statistics
	var totalRevenue float64
	var pendingCount, preparingCount, dispatchedCount, deliveredCount, cancelledCount int

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
		case domain.OrderStatusCancelled:
			cancelledCount++
		}
	}

	// Pagination
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "15"))
	if page < 1 {
		page = 1
	}

	totalItems := len(filtered)
	startIndex := (page - 1) * limit
	endIndex := startIndex + limit

	var pagedOrders []domain.Order
	if startIndex < totalItems {
		if endIndex > totalItems {
			endIndex = totalItems
		}
		pagedOrders = filtered[startIndex:endIndex]
	} else {
		pagedOrders = []domain.Order{}
	}

	JSONSuccess(c, http.StatusOK, gin.H{
		"orders":     pagedOrders,
		"total":      totalItems,
		"page":       page,
		"limit":      limit,
		"totalPages": (totalItems + limit - 1) / limit,
		"stats": gin.H{
			"totalOrders":     len(orders),
			"totalRevenueKES": totalRevenue,
			"pendingOrders":   pendingCount,
			"preparingOrders": preparingCount,
			"activeCouriers":  dispatchedCount,
			"completedOrders": deliveredCount,
			"cancelledOrders": cancelledCount,
		},
	})
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
	var pendingCount, preparingCount, dispatchedCount, deliveredCount, cancelledCount int

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
		case domain.OrderStatusCancelled:
			cancelledCount++
		}
	}

	stats := gin.H{
		"totalOrders":     len(orders),
		"totalRevenueKES": totalRevenue,
		"pendingOrders":   pendingCount,
		"preparingOrders": preparingCount,
		"activeCouriers":  dispatchedCount,
		"completedOrders": deliveredCount,
		"cancelledOrders": cancelledCount,
	}

	JSONSuccess(c, http.StatusOK, stats)
}

// ----------------------------------------------------------------------------
// Bulk Communications Endpoints
// ----------------------------------------------------------------------------

func (h *AdminHandler) GetAudience(c *gin.Context) {
	channel := c.DefaultQuery("channel", "email")
	audience, err := h.adminService.GetAudience(c.Request.Context(), channel)
	if err != nil {
		JSONError(c, http.StatusInternalServerError, "Failed to calculate audience: "+err.Error())
		return
	}

	var simpleAudience []gin.H
	for _, u := range audience {
		target := u.Email
		if channel == "whatsapp" {
			target = u.Phone
		}
		simpleAudience = append(simpleAudience, gin.H{
			"id":     u.ID,
			"name":   u.Name,
			"target": target,
		})
	}

	JSONSuccess(c, http.StatusOK, gin.H{
		"channel":    channel,
		"count":      len(audience),
		"recipients": simpleAudience,
	})
}

func (h *AdminHandler) SendBroadcast(c *gin.Context) {
	var req domain.SendBroadcastRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		JSONError(c, http.StatusBadRequest, "Channel (email or whatsapp), subject, and message are required.")
		return
	}

	logEntry, err := h.adminService.SendBroadcast(c.Request.Context(), req)
	if err != nil {
		JSONError(c, http.StatusBadRequest, err.Error())
		return
	}

	JSONSuccess(c, http.StatusOK, logEntry)
}

func (h *AdminHandler) GetBroadcastLogs(c *gin.Context) {
	logs := h.adminService.GetBroadcastLogs(c.Request.Context())
	JSONSuccess(c, http.StatusOK, logs)
}

// ----------------------------------------------------------------------------
// Operational Notifications Endpoints
// ----------------------------------------------------------------------------

func (h *AdminHandler) GetAdminNotifications(c *gin.Context) {
	notifs := h.adminService.GetAdminNotifications(c.Request.Context())
	JSONSuccess(c, http.StatusOK, notifs)
}

func (h *AdminHandler) MarkNotificationRead(c *gin.Context) {
	id := c.Param("id")
	h.adminService.MarkNotificationRead(c.Request.Context(), id)
	JSONMessage(c, http.StatusOK, "Notification marked as read")
}

// ----------------------------------------------------------------------------
// Today's Specials Endpoints
// ----------------------------------------------------------------------------

func (h *AdminHandler) GetSpecials(c *gin.Context) {
	specials := h.adminService.GetSpecials(c.Request.Context())
	JSONSuccess(c, http.StatusOK, specials)
}

func (h *AdminHandler) CreateSpecial(c *gin.Context) {
	var promo domain.SpecialPromo
	if err := c.ShouldBindJSON(&promo); err != nil {
		JSONError(c, http.StatusBadRequest, "Invalid promo payload: title, description, category, and badge are required.")
		return
	}

	if err := h.adminService.CreateSpecial(c.Request.Context(), &promo); err != nil {
		JSONError(c, http.StatusInternalServerError, err.Error())
		return
	}

	JSONSuccess(c, http.StatusCreated, promo)
}

func (h *AdminHandler) DeleteSpecial(c *gin.Context) {
	id := c.Param("id")
	if err := h.adminService.DeleteSpecial(c.Request.Context(), id); err != nil {
		JSONError(c, http.StatusNotFound, "Special banner not found")
		return
	}

	JSONMessage(c, http.StatusOK, "Special deleted successfully")
}

// ----------------------------------------------------------------------------
// Event Gallery Endpoints
// ----------------------------------------------------------------------------

func (h *AdminHandler) GetGallery(c *gin.Context) {
	photos := h.adminService.GetGallery(c.Request.Context())
	JSONSuccess(c, http.StatusOK, photos)
}

func (h *AdminHandler) AddGalleryPhoto(c *gin.Context) {
	var photo domain.GalleryPhoto
	if err := c.ShouldBindJSON(&photo); err != nil {
		JSONError(c, http.StatusBadRequest, "Photo source and label are required.")
		return
	}

	if err := h.adminService.AddGalleryPhoto(c.Request.Context(), &photo); err != nil {
		JSONError(c, http.StatusInternalServerError, err.Error())
		return
	}

	JSONSuccess(c, http.StatusCreated, photo)
}

func (h *AdminHandler) DeleteGalleryPhoto(c *gin.Context) {
	id := c.Param("id")
	if err := h.adminService.DeleteGalleryPhoto(c.Request.Context(), id); err != nil {
		JSONError(c, http.StatusNotFound, "Photo not found")
		return
	}

	JSONMessage(c, http.StatusOK, "Photo deleted successfully")
}

// ----------------------------------------------------------------------------
// Activities Endpoints
// ----------------------------------------------------------------------------

func (h *AdminHandler) CreateActivity(c *gin.Context) {
	var act domain.Activity
	if err := c.ShouldBindJSON(&act); err != nil {
		JSONError(c, http.StatusBadRequest, "Invalid activity payload")
		return
	}

	if err := h.adminService.CreateActivity(c.Request.Context(), &act); err != nil {
		JSONError(c, http.StatusInternalServerError, err.Error())
		return
	}

	JSONSuccess(c, http.StatusCreated, act)
}

func (h *AdminHandler) UpdateActivity(c *gin.Context) {
	id := c.Param("id")
	var act domain.Activity
	if err := c.ShouldBindJSON(&act); err != nil {
		JSONError(c, http.StatusBadRequest, "Invalid activity payload")
		return
	}
	act.ID = id

	if err := h.adminService.UpdateActivity(c.Request.Context(), &act); err != nil {
		JSONError(c, http.StatusInternalServerError, err.Error())
		return
	}

	JSONSuccess(c, http.StatusOK, act)
}

func (h *AdminHandler) DeleteActivity(c *gin.Context) {
	id := c.Param("id")
	if err := h.adminService.DeleteActivity(c.Request.Context(), id); err != nil {
		JSONError(c, http.StatusInternalServerError, err.Error())
		return
	}

	JSONMessage(c, http.StatusOK, "Activity removed successfully")
}
