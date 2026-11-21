package domain

type OrderStatus string

const (
	OrderStatusPending        OrderStatus = "PENDING"
	OrderStatusConfirmed      OrderStatus = "CONFIRMED"
	OrderStatusPreparing      OrderStatus = "PREPARING"
	OrderStatusOutForDelivery OrderStatus = "OUT_FOR_DELIVERY"
	OrderStatusDelivered      OrderStatus = "DELIVERED"
	OrderStatusCancelled      OrderStatus = "CANCELLED"
)

// DeliveryInfo holds destination information for courier delivery.
type DeliveryInfo struct {
	AddressName          string `json:"addressName"`
	Landmark             string `json:"landmark"`
	EstateBuilding       string `json:"estateBuilding"`
	DeliveryInstructions string `json:"deliveryInstructions"`
	Phone                string `json:"phone"`
	SaveAddress          bool   `json:"saveAddress"`
}

// OrderItemInput represents an item submitted by the mobile client for price calculation and order creation.
// Client prices are NEVER trusted.
type OrderItemInput struct {
	ProductID string  `json:"productId" binding:"required"`
	OptionID  *string `json:"optionId,omitempty"`
	Quantity  int     `json:"quantity" binding:"required,min=1"`
}

// OrderItem represents a finalized order line item with an immutable price snapshot.
type OrderItem struct {
	ID          string  `json:"id"`
	OrderID     string  `json:"orderId"`
	ProductID   string  `json:"productId"`
	ProductName string  `json:"productName"`
	OptionID    *string `json:"optionId,omitempty"`
	OptionName  *string `json:"optionName,omitempty"`
	Quantity    int     `json:"quantity"`
	UnitPrice   float64 `json:"unitPrice"`
	OptionPrice float64 `json:"optionPrice"`
	TotalPrice  float64 `json:"totalPrice"`
}

// PriceCalculationRequest accepts client items and optional delivery preferences to return server-side pricing.
type PriceCalculationRequest struct {
	Items        []OrderItemInput `json:"items" binding:"required,min=1"`
	DeliveryType string           `json:"deliveryType,omitempty"` // "delivery" (default) or "pickup"
}

// PriceSummary is the authoritative server-side price calculation result.
type PriceSummary struct {
	Subtotal    float64     `json:"subtotal"`
	DeliveryFee float64     `json:"deliveryFee"`
	VAT         float64     `json:"vat"`
	Total       float64     `json:"total"`
	Items       []OrderItem `json:"items"`
}

// CreateOrderRequest is the payload to place an order.
type CreateOrderRequest struct {
	Items          []OrderItemInput `json:"items" binding:"required,min=1"`
	DeliveryInfo   DeliveryInfo     `json:"deliveryInfo" binding:"required"`
	PaymentMethod  string           `json:"paymentMethod" binding:"required,oneof=mpesa card cash"`
	WorkOrderNotes *string          `json:"workOrderNotes,omitempty"`
}

// Coordinates holds geographic latitude and longitude for live courier tracking.
type Coordinates struct {
	Lat float64 `json:"lat"`
	Lng float64 `json:"lng"`
}

// CourierInfo details courier details and current GPS coordinates.
type CourierInfo struct {
	Name     string       `json:"name"`
	Phone    string       `json:"phone"`
	Location *Coordinates `json:"location,omitempty"`
}

// TrackingStep describes an event in the order timeline.
type TrackingStep struct {
	Status    OrderStatus `json:"status"`
	Label     string      `json:"label"`
	Time      *EATTime    `json:"time"`
	Completed bool        `json:"completed"`
}

// OrderTracking represents the live status and tracking payload returned via WebSocket and REST fallback.
type OrderTracking struct {
	OrderID                  string         `json:"orderId"`
	Status                   OrderStatus    `json:"status"`
	StatusStep               int            `json:"statusStep"`
	TotalSteps               int            `json:"totalSteps"`
	EstimatedDeliveryMinutes int            `json:"estimatedDeliveryMinutes"`
	Courier                  *CourierInfo   `json:"courier,omitempty"`
	Timeline                 []TrackingStep `json:"timeline"`
	UpdatedAt                EATTime        `json:"updatedAt"`
}

// Order represents a complete order record in PostgreSQL.
type Order struct {
	ID                       string       `json:"id"`
	UserID                   string       `json:"userId"`
	Status                   OrderStatus  `json:"status"`
	Subtotal                 float64      `json:"subtotal"`
	DeliveryFee              float64      `json:"deliveryFee"`
	VAT                      float64      `json:"vat"`
	Total                    float64      `json:"total"`
	PaymentMethod            string       `json:"paymentMethod"`
	PaymentStatus            string       `json:"paymentStatus"`
	DeliveryInfo             DeliveryInfo `json:"deliveryInfo"`
	Courier                  *CourierInfo `json:"courier,omitempty"`
	EstimatedDeliveryMinutes int          `json:"estimatedDeliveryMinutes"`
	Items                    []OrderItem  `json:"items"`
	IdempotencyKey           *string      `json:"idempotencyKey,omitempty"`
	CreatedAt                EATTime      `json:"createdAt"`
	UpdatedAt                EATTime      `json:"updatedAt"`
}

// UpdateOrderStatusRequest is used by Admin to advance the order state machine.
type UpdateOrderStatusRequest struct {
	Status OrderStatus `json:"status" binding:"required"`
}

// DispatchCourierRequest is used by Admin to assign a courier and push live coordinates.
type DispatchCourierRequest struct {
	CourierName              string       `json:"courierName" binding:"required"`
	CourierPhone             string       `json:"courierPhone" binding:"required"`
	Location                 *Coordinates `json:"location,omitempty"`
	EstimatedDeliveryMinutes int          `json:"estimatedDeliveryMinutes,omitempty"`
}

// UpdateLocationRequest updates the courier's real-time GPS location.
type UpdateLocationRequest struct {
	Lat float64 `json:"lat" binding:"required"`
	Lng float64 `json:"lng" binding:"required"`
}
