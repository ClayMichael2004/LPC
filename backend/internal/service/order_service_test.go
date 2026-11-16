package service_test

import (
	"context"
	"testing"

	"github.com/littlepolocafe/backend/internal/domain"
	"github.com/littlepolocafe/backend/internal/repository/postgres"
	"github.com/littlepolocafe/backend/internal/service"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

type mockOrderStore struct {
	orders   map[string]*domain.Order
	tracking map[string]*domain.OrderTracking
	failOOS  bool
}

func newMockOrderStore() *mockOrderStore {
	return &mockOrderStore{
		orders:   make(map[string]*domain.Order),
		tracking: make(map[string]*domain.OrderTracking),
	}
}

func (m *mockOrderStore) CreateOrderAtomic(ctx context.Context, order *domain.Order) error {
	if m.failOOS {
		return postgres.OutOfStockError{
			ProductID:   "nyama-nyama-burger",
			ProductName: "Nyama Nyama Burger",
			Requested:   5,
			Available:   0,
		}
	}
	m.orders[order.ID] = order
	m.tracking[order.ID] = &domain.OrderTracking{
		OrderID:                  order.ID,
		Status:                   order.Status,
		StatusStep:               1,
		TotalSteps:               5,
		EstimatedDeliveryMinutes: 25,
		UpdatedAt:                domain.NowEAT(),
	}
	return nil
}

func (m *mockOrderStore) GetOrderByID(ctx context.Context, id string) (*domain.Order, error) {
	if o, ok := m.orders[id]; ok {
		return o, nil
	}
	return nil, postgres.ErrOrderNotFound
}

func (m *mockOrderStore) GetOrdersByUserID(ctx context.Context, userID string) ([]domain.Order, error) {
	var res []domain.Order
	for _, o := range m.orders {
		if o.UserID == userID {
			res = append(res, *o)
		}
	}
	return res, nil
}

func (m *mockOrderStore) GetAllOrders(ctx context.Context, statusFilter *domain.OrderStatus) ([]domain.Order, error) {
	var res []domain.Order
	for _, o := range m.orders {
		if statusFilter == nil || o.Status == *statusFilter {
			res = append(res, *o)
		}
	}
	return res, nil
}

func (m *mockOrderStore) UpdateOrderStatus(ctx context.Context, orderID string, status domain.OrderStatus, label string, stepIndex int) error {
	o, ok := m.orders[orderID]
	if !ok {
		return postgres.ErrOrderNotFound
	}
	o.Status = status
	if tr, ok := m.tracking[orderID]; ok {
		tr.Status = status
		tr.StatusStep = stepIndex
	}
	return nil
}

func (m *mockOrderStore) UpdateCourier(ctx context.Context, orderID string, courierName string, courierPhone string, lat, lng *float64, eta int) error {
	o, ok := m.orders[orderID]
	if !ok {
		return postgres.ErrOrderNotFound
	}
	o.Courier = &domain.CourierInfo{Name: courierName, Phone: courierPhone}
	if lat != nil && lng != nil {
		o.Courier.Location = &domain.Coordinates{Lat: *lat, Lng: *lng}
	}
	if eta > 0 {
		o.EstimatedDeliveryMinutes = eta
	}
	return nil
}

func (m *mockOrderStore) UpdateCourierLocation(ctx context.Context, orderID string, lat, lng float64) error {
	o, ok := m.orders[orderID]
	if !ok {
		return postgres.ErrOrderNotFound
	}
	if o.Courier == nil {
		o.Courier = &domain.CourierInfo{}
	}
	o.Courier.Location = &domain.Coordinates{Lat: lat, Lng: lng}
	return nil
}

func (m *mockOrderStore) GetOrderTracking(ctx context.Context, orderID string) (*domain.OrderTracking, error) {
	if tr, ok := m.tracking[orderID]; ok {
		return tr, nil
	}
	return nil, postgres.ErrOrderNotFound
}

func TestOrderService_CreateOrder_AtomicSuccess(t *testing.T) {
	productRepo := &mockProductReader{
		products: map[string]*domain.Product{
			"big-boss-burger": {
				ID:    "big-boss-burger",
				Name:  "Big Boss Burger",
				Price: 850.00,
			},
		},
	}
	pricingService := service.NewPricingService(productRepo)
	orderStore := newMockOrderStore()
	orderService := service.NewOrderService(orderStore, pricingService, nil)

	ctx := context.Background()
	req := &domain.CreateOrderRequest{
		Items: []domain.OrderItemInput{
			{ProductID: "big-boss-burger", Quantity: 2},
		},
		DeliveryInfo: domain.DeliveryInfo{
			AddressName:    "East Kisumu Villa",
			Landmark:       "Near Mega Plaza",
			EstateBuilding: "Block B, Apt 4",
			Phone:          "+254 712 345 678",
			SaveAddress:    true,
		},
		PaymentMethod: "mpesa",
	}

	order, err := orderService.CreateOrder(ctx, "usr-1", req, nil)
	require.NoError(t, err)
	require.NotNil(t, order)

	// Price calculations verified server-side:
	// Subtotal = 850 * 2 = 1700.00
	// DeliveryFee = 150.00
	// Total = 1850.00
	assert.Equal(t, 1700.00, order.Subtotal)
	assert.Equal(t, 150.00, order.DeliveryFee)
	assert.Equal(t, 1850.00, order.Total)
	assert.Equal(t, domain.OrderStatusPending, order.Status)
	assert.Equal(t, "usr-1", order.UserID)
	assert.Contains(t, order.ID, "LPC-")
}

func TestOrderService_OutOfStockGuard(t *testing.T) {
	productRepo := &mockProductReader{
		products: map[string]*domain.Product{
			"nyama-nyama-burger": {
				ID:    "nyama-nyama-burger",
				Name:  "Nyama Nyama Burger",
				Price: 900.00,
			},
		},
	}
	pricingService := service.NewPricingService(productRepo)
	orderStore := newMockOrderStore()
	orderStore.failOOS = true // Simulate atomic out-of-stock guard trigger

	orderService := service.NewOrderService(orderStore, pricingService, nil)

	ctx := context.Background()
	req := &domain.CreateOrderRequest{
		Items: []domain.OrderItemInput{
			{ProductID: "nyama-nyama-burger", Quantity: 5},
		},
		DeliveryInfo: domain.DeliveryInfo{
			AddressName: "Kisumu Central",
			Phone:       "+254 712 345 678",
		},
		PaymentMethod: "mpesa",
	}

	_, err := orderService.CreateOrder(ctx, "usr-1", req, nil)
	assert.Error(t, err)
	var oosErr postgres.OutOfStockError
	assert.ErrorAs(t, err, &oosErr)
	assert.Contains(t, err.Error(), "out of stock")
}

func TestOrderService_StatusLifecycleAndCourierDispatch(t *testing.T) {
	productRepo := &mockProductReader{
		products: map[string]*domain.Product{
			"big-boss-burger": {ID: "big-boss-burger", Name: "Big Boss Burger", Price: 850.00},
		},
	}
	pricingService := service.NewPricingService(productRepo)
	orderStore := newMockOrderStore()
	orderService := service.NewOrderService(orderStore, pricingService, nil)

	ctx := context.Background()
	req := &domain.CreateOrderRequest{
		Items:         []domain.OrderItemInput{{ProductID: "big-boss-burger", Quantity: 1}},
		DeliveryInfo:  domain.DeliveryInfo{AddressName: "Milimani, Kisumu", Phone: "+254712345678"},
		PaymentMethod: "mpesa",
	}

	order, err := orderService.CreateOrder(ctx, "usr-1", req, nil)
	require.NoError(t, err)

	// 1. Cafe owner confirms order
	tr, err := orderService.AdvanceOrderStatus(ctx, order.ID, domain.OrderStatusConfirmed)
	require.NoError(t, err)
	assert.Equal(t, domain.OrderStatusConfirmed, tr.Status)
	assert.Equal(t, 2, tr.StatusStep)

	// 2. Kitchen prepares order
	tr, err = orderService.AdvanceOrderStatus(ctx, order.ID, domain.OrderStatusPreparing)
	require.NoError(t, err)
	assert.Equal(t, domain.OrderStatusPreparing, tr.Status)
	assert.Equal(t, 3, tr.StatusStep)

	// 3. Dispatch Courier
	lat := -0.0917
	lng := 34.7680
	dispatchReq := &domain.DispatchCourierRequest{
		CourierName:              "Kisumu Express Delivery Team",
		CourierPhone:             "+254 704 769 219",
		Location:                 &domain.Coordinates{Lat: lat, Lng: lng},
		EstimatedDeliveryMinutes: 20,
	}
	tr, err = orderService.DispatchCourier(ctx, order.ID, dispatchReq)
	require.NoError(t, err)
	assert.Equal(t, domain.OrderStatusOutForDelivery, tr.Status)
	assert.Equal(t, 4, tr.StatusStep)

	// 4. Update live GPS coordinates
	err = orderService.UpdateLocation(ctx, order.ID, -0.0950, 34.7695)
	require.NoError(t, err)

	updatedOrder, _ := orderService.GetOrderByID(ctx, order.ID)
	assert.Equal(t, -0.0950, updatedOrder.Courier.Location.Lat)
	assert.Equal(t, 34.7695, updatedOrder.Courier.Location.Lng)

	// 5. Complete Delivery
	tr, err = orderService.AdvanceOrderStatus(ctx, order.ID, domain.OrderStatusDelivered)
	require.NoError(t, err)
	assert.Equal(t, domain.OrderStatusDelivered, tr.Status)
	assert.Equal(t, 5, tr.StatusStep)
}
