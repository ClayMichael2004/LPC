package service

import (
	"context"
	"crypto/rand"
	"fmt"
	"math/big"

	"github.com/littlepolocafe/backend/internal/domain"
	"github.com/littlepolocafe/backend/internal/transport/websocket"
)

type OrderStore interface {
	CreateOrderAtomic(ctx context.Context, order *domain.Order) error
	GetOrderByID(ctx context.Context, id string) (*domain.Order, error)
	GetOrdersByUserID(ctx context.Context, userID string) ([]domain.Order, error)
	GetAllOrders(ctx context.Context, statusFilter *domain.OrderStatus) ([]domain.Order, error)
	UpdateOrderStatus(ctx context.Context, orderID string, status domain.OrderStatus, label string, stepIndex int) error
	UpdateCourier(ctx context.Context, orderID string, courierName string, courierPhone string, lat, lng *float64, eta int) error
	UpdateCourierLocation(ctx context.Context, orderID string, lat, lng float64) error
	GetOrderTracking(ctx context.Context, orderID string) (*domain.OrderTracking, error)
}

type OrderService struct {
	orderRepo      OrderStore
	pricingService *PricingService
	wsHub          *websocket.Hub
	onNewOrder     func(o *domain.Order)
}

func NewOrderService(
	orderRepo OrderStore,
	pricingService *PricingService,
	wsHub *websocket.Hub,
) *OrderService {
	return &OrderService{
		orderRepo:      orderRepo,
		pricingService: pricingService,
		wsHub:          wsHub,
	}
}

func (s *OrderService) SetOnNewOrder(cb func(o *domain.Order)) {
	s.onNewOrder = cb
}

// CreateOrder enforces server-side pricing, executes an atomic ACID transaction in PostgreSQL,
// checks out-of-stock guards, and triggers WebSocket events.
func (s *OrderService) CreateOrder(
	ctx context.Context,
	userID string,
	req *domain.CreateOrderRequest,
	idempotencyKey *string,
) (*domain.Order, error) {
	// 1. Authoritative Server-Side Price Calculation
	pricing, err := s.pricingService.CalculatePrice(ctx, req.Items, "delivery")
	if err != nil {
		return nil, fmt.Errorf("pricing calculation failed: %w", err)
	}

	// 2. Generate friendly LPC Order ID (e.g. LPC-8924)
	orderID := generateFriendlyOrderID()

	order := &domain.Order{
		ID:                       orderID,
		UserID:                   userID,
		Status:                   domain.OrderStatusPending,
		Subtotal:                 pricing.Subtotal,
		DeliveryFee:              pricing.DeliveryFee,
		VAT:                      pricing.VAT,
		Total:                    pricing.Total,
		PaymentMethod:            req.PaymentMethod,
		PaymentStatus:            "PENDING",
		DeliveryInfo:             req.DeliveryInfo,
		EstimatedDeliveryMinutes: 25,
		Items:                    pricing.Items,
		IdempotencyKey:           idempotencyKey,
	}

	// 3. Execute Atomic Database Transaction with Pessimistic Lock
	if err := s.orderRepo.CreateOrderAtomic(ctx, order); err != nil {
		return nil, err
	}

	// 4. Broadcast live notification to Cafe Owner WebSocket
	if s.wsHub != nil {
		tracking, err := s.orderRepo.GetOrderTracking(ctx, order.ID)
		if err == nil {
			s.wsHub.BroadcastOrderUpdate(order.ID, tracking)
		}
	}

	if s.onNewOrder != nil {
		s.onNewOrder(order)
	}

	return order, nil
}

// GetOrderByID retrieves the full order record.
func (s *OrderService) GetOrderByID(ctx context.Context, id string) (*domain.Order, error) {
	return s.orderRepo.GetOrderByID(ctx, id)
}

// GetUserOrders retrieves orders placed by a specific customer.
func (s *OrderService) GetUserOrders(ctx context.Context, userID string) ([]domain.Order, error) {
	return s.orderRepo.GetOrdersByUserID(ctx, userID)
}

// GetAllOrders retrieves orders for cafe owner management.
func (s *OrderService) GetAllOrders(ctx context.Context, status *domain.OrderStatus) ([]domain.Order, error) {
	return s.orderRepo.GetAllOrders(ctx, status)
}

// AdvanceOrderStatus transitions an order to a new state and broadcasts via WebSocket.
func (s *OrderService) AdvanceOrderStatus(ctx context.Context, orderID string, newStatus domain.OrderStatus) (*domain.OrderTracking, error) {
	var label string
	var stepIndex int

	switch newStatus {
	case domain.OrderStatusPending:
		label = "Order Placed"
		stepIndex = 1
	case domain.OrderStatusConfirmed:
		label = "Confirmed by Cafe"
		stepIndex = 2
	case domain.OrderStatusPreparing:
		label = "Kitchen Preparing"
		stepIndex = 3
	case domain.OrderStatusOutForDelivery:
		label = "Courier Dispatched"
		stepIndex = 4
	case domain.OrderStatusDelivered:
		label = "Delivered"
		stepIndex = 5
	case domain.OrderStatusCancelled:
		label = "Cancelled"
		stepIndex = 0
	default:
		return nil, fmt.Errorf("unknown order status: %s", newStatus)
	}

	if err := s.orderRepo.UpdateOrderStatus(ctx, orderID, newStatus, label, stepIndex); err != nil {
		return nil, err
	}

	tracking, err := s.orderRepo.GetOrderTracking(ctx, orderID)
	if err != nil {
		return nil, err
	}

	// Broadcast to WebSocket clients
	if s.wsHub != nil {
		s.wsHub.BroadcastOrderUpdate(orderID, tracking)
	}

	return tracking, nil
}

// DispatchCourier assigns courier details and estimated delivery time.
func (s *OrderService) DispatchCourier(ctx context.Context, orderID string, req *domain.DispatchCourierRequest) (*domain.OrderTracking, error) {
	var lat, lng *float64
	if req.Location != nil {
		lat = &req.Location.Lat
		lng = &req.Location.Lng
	}

	eta := req.EstimatedDeliveryMinutes
	if eta <= 0 {
		eta = 25
	}

	if err := s.orderRepo.UpdateCourier(ctx, orderID, req.CourierName, req.CourierPhone, lat, lng, eta); err != nil {
		return nil, err
	}

	// Advance status to OUT_FOR_DELIVERY automatically
	return s.AdvanceOrderStatus(ctx, orderID, domain.OrderStatusOutForDelivery)
}

// UpdateLocation pushes real-time courier GPS coordinates.
func (s *OrderService) UpdateLocation(ctx context.Context, orderID string, lat, lng float64) error {
	if err := s.orderRepo.UpdateCourierLocation(ctx, orderID, lat, lng); err != nil {
		return err
	}

	if s.wsHub != nil {
		s.wsHub.BroadcastCourierLocation(orderID, domain.Coordinates{Lat: lat, Lng: lng})
	}
	return nil
}

// GetOrderTracking provides the REST fallback for live tracking.
func (s *OrderService) GetOrderTracking(ctx context.Context, orderID string) (*domain.OrderTracking, error) {
	return s.orderRepo.GetOrderTracking(ctx, orderID)
}

func generateFriendlyOrderID() string {
	n, _ := rand.Int(rand.Reader, big.NewInt(9000))
	return fmt.Sprintf("LPC-%04d", n.Int64()+1000)
}
