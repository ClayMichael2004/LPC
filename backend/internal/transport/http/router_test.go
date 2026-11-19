package http_test

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/alicebob/miniredis/v2"
	"github.com/gin-gonic/gin"
	"github.com/littlepolocafe/backend/internal/config"
	"github.com/littlepolocafe/backend/internal/domain"
	"github.com/littlepolocafe/backend/internal/repository/redis"
	"github.com/littlepolocafe/backend/internal/service"
	httptransport "github.com/littlepolocafe/backend/internal/transport/http"
	"github.com/littlepolocafe/backend/internal/transport/websocket"
	redisclient "github.com/redis/go-redis/v9"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// In-Memory Test Repositories
type testProductRepo struct {
	products   map[string]*domain.Product
	categories []domain.Category
}

func (r *testProductRepo) GetAllCategories(ctx context.Context) ([]domain.Category, error) {
	return r.categories, nil
}
func (r *testProductRepo) GetAllProducts(ctx context.Context) ([]domain.Product, error) {
	var list []domain.Product
	for _, p := range r.products {
		list = append(list, *p)
	}
	return list, nil
}
func (r *testProductRepo) GetProductByID(ctx context.Context, id string) (*domain.Product, error) {
	if p, ok := r.products[id]; ok {
		return p, nil
	}
	return nil, fmt.Errorf("product not found: %s", id)
}
func (r *testProductRepo) UpdateStock(ctx context.Context, id string, isAvailable *bool, stockQty *int) error {
	return nil
}
func (r *testProductRepo) CreateProduct(ctx context.Context, p *domain.Product) error {
	r.products[p.ID] = p
	return nil
}
func (r *testProductRepo) UpdateProduct(ctx context.Context, p *domain.Product) error {
	r.products[p.ID] = p
	return nil
}
func (r *testProductRepo) DeleteProduct(ctx context.Context, id string) error {
	delete(r.products, id)
	return nil
}

type testUserRepo struct {
	users map[string]*domain.User
}

func (r *testUserRepo) Create(ctx context.Context, u *domain.User) error {
	r.users[u.ID] = u
	return nil
}
func (r *testUserRepo) GetByID(ctx context.Context, id string) (*domain.User, error) {
	if u, ok := r.users[id]; ok {
		return u, nil
	}
	return nil, fmt.Errorf("user not found: %s", id)
}
func (r *testUserRepo) GetByPhone(ctx context.Context, phone string) (*domain.User, error) {
	for _, u := range r.users {
		if u.Phone == phone {
			return u, nil
		}
	}
	return nil, fmt.Errorf("user not found by phone: %s", phone)
}
func (r *testUserRepo) GetByEmail(ctx context.Context, email string) (*domain.User, error) {
	for _, u := range r.users {
		if u.Email == email {
			return u, nil
		}
	}
	return nil, fmt.Errorf("user not found by email: %s", email)
}
func (r *testUserRepo) Update(ctx context.Context, u *domain.User) error {
	r.users[u.ID] = u
	return nil
}
func (r *testUserRepo) GetAll(ctx context.Context) ([]*domain.User, error) {
	var list []*domain.User
	for _, u := range r.users {
		list = append(list, u)
	}
	return list, nil
}

type testOrderRepo struct {
	orders   map[string]*domain.Order
	tracking map[string]*domain.OrderTracking
}

func (r *testOrderRepo) CreateOrderAtomic(ctx context.Context, order *domain.Order) error {
	r.orders[order.ID] = order
	r.tracking[order.ID] = &domain.OrderTracking{
		OrderID:                  order.ID,
		Status:                   order.Status,
		StatusStep:               1,
		TotalSteps:               5,
		EstimatedDeliveryMinutes: 25,
		UpdatedAt:                domain.NowEAT(),
	}
	return nil
}
func (r *testOrderRepo) GetOrderByID(ctx context.Context, id string) (*domain.Order, error) {
	if o, ok := r.orders[id]; ok {
		return o, nil
	}
	return nil, fmt.Errorf("order not found: %s", id)
}
func (r *testOrderRepo) GetOrdersByUserID(ctx context.Context, userID string) ([]domain.Order, error) {
	var list []domain.Order
	for _, o := range r.orders {
		if o.UserID == userID {
			list = append(list, *o)
		}
	}
	return list, nil
}
func (r *testOrderRepo) GetAllOrders(ctx context.Context, statusFilter *domain.OrderStatus) ([]domain.Order, error) {
	var list []domain.Order
	for _, o := range r.orders {
		if statusFilter == nil || o.Status == *statusFilter {
			list = append(list, *o)
		}
	}
	return list, nil
}
func (r *testOrderRepo) UpdateOrderStatus(ctx context.Context, orderID string, status domain.OrderStatus, label string, stepIndex int) error {
	if o, ok := r.orders[orderID]; ok {
		o.Status = status
		if tr, ok := r.tracking[orderID]; ok {
			tr.Status = status
			tr.StatusStep = stepIndex
		}
	}
	return nil
}
func (r *testOrderRepo) UpdateCourier(ctx context.Context, orderID string, courierName string, courierPhone string, lat, lng *float64, eta int) error {
	return nil
}
func (r *testOrderRepo) UpdateCourierLocation(ctx context.Context, orderID string, lat, lng float64) error {
	return nil
}
func (r *testOrderRepo) GetOrderTracking(ctx context.Context, orderID string) (*domain.OrderTracking, error) {
	if tr, ok := r.tracking[orderID]; ok {
		return tr, nil
	}
	return nil, fmt.Errorf("tracking not found: %s", orderID)
}

type testActivityRepo struct {
	activities []domain.Activity
}

func (r *testActivityRepo) GetAllActivities(ctx context.Context) ([]domain.Activity, error) {
	return r.activities, nil
}
func (r *testActivityRepo) GetActivityByID(ctx context.Context, id string) (*domain.Activity, error) {
	for _, a := range r.activities {
		if a.ID == id {
			return &a, nil
		}
	}
	return nil, fmt.Errorf("activity not found: %s", id)
}

func setupTestApp(t *testing.T) (*gin.Engine, *config.Config, *testOrderRepo) {
	gin.SetMode(gin.TestMode)

	cfg := config.Load()
	cfg.Env = "test"
	cfg.JWTSecret = "test-jwt-secret-east-africa"
	cfg.AdminEmail = "mikewillmakeit2004@gmail.com"
	cfg.AdminPassword = "AdminLPC2026!"

	mr := miniredis.RunT(t)
	rdb := redisclient.NewClient(&redisclient.Options{Addr: mr.Addr()})

	menuCache := redis.NewMenuCache(rdb)
	idempotencyStore := redis.NewIdempotencyStore(rdb)
	wsHub := websocket.NewHub(rdb)

	productRepo := &testProductRepo{
		categories: []domain.Category{
			{ID: "burgers", Name: "Polo Burgers", Image: "cat-grid-1.png", DisplayOrder: 1},
		},
		products: map[string]*domain.Product{
			"big-boss-burger": {
				ID:       "big-boss-burger",
				Name:     "Big Boss Burger",
				Category: "burgers",
				Price:    850.00,
			},
		},
	}

	userRepo := &testUserRepo{
		users: map[string]*domain.User{
			"usr-customer": {
				ID:       "usr-customer",
				Name:     "Michael Clay",
				Initials: "MC",
				Phone:    "+254712345678",
				Email:    "michaelclay2225@gmail.com",
				Role:     domain.RoleCustomer,
			},
			"usr-admin": {
				ID:       "usr-admin",
				Name:     "Cafe Owner Admin",
				Initials: "CA",
				Phone:    "+254704769219",
				Email:    "mikewillmakeit2004@gmail.com",
				Role:     domain.RoleAdmin,
			},
		},
	}

	orderRepo := &testOrderRepo{
		orders:   make(map[string]*domain.Order),
		tracking: make(map[string]*domain.OrderTracking),
	}

	activityRepo := &testActivityRepo{
		activities: []domain.Activity{
			{
				ID:             "act-painting",
				Title:          "Sunday Family Oil Painting",
				Schedule:       "12:00 PM – 2:00 PM",
				Location:       "Cafe Garden, Kisumu",
				WhatsAppNumber: "254704769219",
				IsActive:       true,
			},
		},
	}

	emailService := service.NewEmailService(cfg)
	authService := service.NewAuthService(cfg, userRepo, emailService, rdb)
	pricingService := service.NewPricingService(productRepo)
	menuService := service.NewMenuService(productRepo, menuCache)
	orderService := service.NewOrderService(orderRepo, pricingService, wsHub)
	adminService := service.NewAdminService(userRepo, emailService, menuService, activityRepo)

	handlers := &httptransport.Handlers{
		AuthHandler:      httptransport.NewAuthHandler(authService, userRepo),
		MenuHandler:      httptransport.NewMenuHandler(menuService),
		OrderHandler:     httptransport.NewOrderHandler(orderService, pricingService),
		AdminHandler:     httptransport.NewAdminHandler(orderService, menuService, adminService),
		ActivityHandler:  httptransport.NewActivityHandler(activityRepo),
		WSHub:            wsHub,
		RedisClient:      rdb,
		IdempotencyStore: idempotencyStore,
	}

	router := httptransport.SetupRouter(cfg, handlers)
	return router, cfg, orderRepo
}

func TestHTTP_HealthEndpoint(t *testing.T) {
	router, _, _ := setupTestApp(t)

	w := httptest.NewRecorder()
	req, _ := http.NewRequest(http.MethodGet, "/health", nil)
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
	assert.Contains(t, w.Body.String(), "Africa/Nairobi (EAT, UTC+3)")
	assert.Contains(t, w.Body.String(), "Little Polo Cafe Backend")
}

func TestHTTP_PriceCalculationEndpoint(t *testing.T) {
	router, _, _ := setupTestApp(t)

	// 2 x big-boss-burger (850 each) + 150 delivery = 1850 total
	payload := domain.PriceCalculationRequest{
		Items: []domain.OrderItemInput{
			{ProductID: "big-boss-burger", Quantity: 2},
		},
		DeliveryType: "delivery",
	}
	body, _ := json.Marshal(payload)

	w := httptest.NewRecorder()
	req, _ := http.NewRequest(http.MethodPost, "/api/v1/orders/calculate", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
	var resp httptransport.Response
	err := json.Unmarshal(w.Body.Bytes(), &resp)
	require.NoError(t, err)
	assert.True(t, resp.Success)

	dataMap := resp.Data.(map[string]interface{})
	assert.Equal(t, float64(1700), dataMap["subtotal"])
	assert.Equal(t, float64(150), dataMap["deliveryFee"])
	assert.Equal(t, float64(1850), dataMap["total"])
}

func TestHTTP_FullMenuEndpoint(t *testing.T) {
	router, _, _ := setupTestApp(t)

	w := httptest.NewRecorder()
	req, _ := http.NewRequest(http.MethodGet, "/api/v1/menu", nil)
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
	assert.Contains(t, w.Body.String(), "Polo Burgers")
	assert.Contains(t, w.Body.String(), "Big Boss Burger")
}

func TestHTTP_ActivitiesEndpoint(t *testing.T) {
	router, _, _ := setupTestApp(t)

	w := httptest.NewRecorder()
	req, _ := http.NewRequest(http.MethodGet, "/api/v1/activities", nil)
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
	assert.Contains(t, w.Body.String(), "Sunday Family Oil Painting")
}

func TestHTTP_AuthAndRBAC(t *testing.T) {
	router, cfg, _ := setupTestApp(t)

	// 1. Customer OTP Verification
	verifyReq := domain.OTPVerifyRequest{
		Identifier: "+254712345678",
		Code:       "1234", // Test bypass code
	}
	verifyBytes, _ := json.Marshal(verifyReq)
	w := httptest.NewRecorder()
	req, _ := http.NewRequest(http.MethodPost, "/api/v1/auth/otp/verify", bytes.NewReader(verifyBytes))
	req.Header.Set("Content-Type", "application/json")
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
	var custAuthResp httptransport.Response
	_ = json.Unmarshal(w.Body.Bytes(), &custAuthResp)
	custData := custAuthResp.Data.(map[string]interface{})
	customerToken := custData["token"].(string)

	// 2. Admin Login
	adminReq := domain.AdminLoginRequest{
		Email:    cfg.AdminEmail,
		Password: cfg.AdminPassword,
	}
	adminBytes, _ := json.Marshal(adminReq)
	w = httptest.NewRecorder()
	req, _ = http.NewRequest(http.MethodPost, "/api/v1/auth/admin/login", bytes.NewReader(adminBytes))
	req.Header.Set("Content-Type", "application/json")
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
	var adminAuthResp httptransport.Response
	_ = json.Unmarshal(w.Body.Bytes(), &adminAuthResp)
	adminData := adminAuthResp.Data.(map[string]interface{})
	adminToken := adminData["token"].(string)

	// 3. Customer tries calling Admin endpoint -> 403 Forbidden!
	w = httptest.NewRecorder()
	req, _ = http.NewRequest(http.MethodGet, "/api/v1/admin/orders", nil)
	req.Header.Set("Authorization", "Bearer "+customerToken)
	router.ServeHTTP(w, req)
	assert.Equal(t, http.StatusForbidden, w.Code)

	// 4. Admin calls Admin endpoint -> 200 OK!
	w = httptest.NewRecorder()
	req, _ = http.NewRequest(http.MethodGet, "/api/v1/admin/orders", nil)
	req.Header.Set("Authorization", "Bearer "+adminToken)
	router.ServeHTTP(w, req)
	assert.Equal(t, http.StatusOK, w.Code)
}

func TestHTTP_OrderPlacementWithIdempotencyAndTrackingFallback(t *testing.T) {
	router, _, orderRepo := setupTestApp(t)

	// Verify Customer Token
	verifyReq := domain.OTPVerifyRequest{
		Identifier: "+254712345678",
		Code:       "1234",
	}
	verifyBytes, _ := json.Marshal(verifyReq)
	w := httptest.NewRecorder()
	req, _ := http.NewRequest(http.MethodPost, "/api/v1/auth/otp/verify", bytes.NewReader(verifyBytes))
	req.Header.Set("Content-Type", "application/json")
	router.ServeHTTP(w, req)
	var custAuthResp httptransport.Response
	_ = json.Unmarshal(w.Body.Bytes(), &custAuthResp)
	customerToken := custAuthResp.Data.(map[string]interface{})["token"].(string)

	// Place order with Idempotency-Key
	orderPayload := domain.CreateOrderRequest{
		Items: []domain.OrderItemInput{
			{ProductID: "big-boss-burger", Quantity: 1},
		},
		DeliveryInfo: domain.DeliveryInfo{
			AddressName: "East Kisumu",
			Phone:       "+254712345678",
		},
		PaymentMethod: "mpesa",
	}
	orderBytes, _ := json.Marshal(orderPayload)
	idempKey := "idem-order-test-uuid-99"

	// Request 1
	w = httptest.NewRecorder()
	req, _ = http.NewRequest(http.MethodPost, "/api/v1/orders", bytes.NewReader(orderBytes))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+customerToken)
	req.Header.Set("Idempotency-Key", idempKey)
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusCreated, w.Code)
	var orderResp httptransport.Response
	_ = json.Unmarshal(w.Body.Bytes(), &orderResp)
	orderData := orderResp.Data.(map[string]interface{})
	orderID := orderData["id"].(string)
	assert.Contains(t, orderID, "LPC-")

	// Request 2 (Duplicate Idempotency Key) -> Exact Replay
	w2 := httptest.NewRecorder()
	req2, _ := http.NewRequest(http.MethodPost, "/api/v1/orders", bytes.NewReader(orderBytes))
	req2.Header.Set("Content-Type", "application/json")
	req2.Header.Set("Authorization", "Bearer "+customerToken)
	req2.Header.Set("Idempotency-Key", idempKey)
	router.ServeHTTP(w2, req2)

	assert.Equal(t, http.StatusCreated, w2.Code)
	assert.Equal(t, "true", w2.Header().Get("Idempotent-Replayed"))
	assert.Equal(t, w.Body.String(), w2.Body.String())

	// REST Fallback for Live Tracking (Authenticated Owner Only)
	wTrack := httptest.NewRecorder()
	reqTrack, _ := http.NewRequest(http.MethodGet, "/api/v1/orders/"+orderID+"/tracking", nil)
	reqTrack.Header.Set("Authorization", "Bearer "+customerToken)
	router.ServeHTTP(wTrack, reqTrack)

	assert.Equal(t, http.StatusOK, wTrack.Code)
	assert.Contains(t, wTrack.Body.String(), orderID)
	assert.Contains(t, wTrack.Body.String(), "PENDING")

	_ = orderRepo
}

func TestHTTP_SingleDeviceSessionAndCrossAccountIsolation(t *testing.T) {
	router, _, _ := setupTestApp(t)

	// 1. Register & Login User A on Device 1
	regA := domain.RegisterRequest{
		Name:     "User One",
		Email:    "user1@kisumu.ke",
		Phone:    "+254700111111",
		Password: "PasswordA123!",
	}
	regABytes, _ := json.Marshal(regA)
	w := httptest.NewRecorder()
	req, _ := http.NewRequest(http.MethodPost, "/api/v1/auth/register", bytes.NewReader(regABytes))
	req.Header.Set("Content-Type", "application/json")
	router.ServeHTTP(w, req)
	require.Equal(t, http.StatusCreated, w.Code)

	loginA := domain.LoginRequest{Identifier: "user1@kisumu.ke", Password: "PasswordA123!"}
	loginABytes, _ := json.Marshal(loginA)

	// Device 1 Login -> tokenA1
	w1 := httptest.NewRecorder()
	req1, _ := http.NewRequest(http.MethodPost, "/api/v1/auth/login", bytes.NewReader(loginABytes))
	req1.Header.Set("Content-Type", "application/json")
	router.ServeHTTP(w1, req1)
	require.Equal(t, http.StatusOK, w1.Code)
	var resp1 httptransport.Response
	_ = json.Unmarshal(w1.Body.Bytes(), &resp1)
	tokenA1 := resp1.Data.(map[string]interface{})["token"].(string)

	// Place an order as User A on Device 1
	orderPayload := domain.CreateOrderRequest{
		Items:         []domain.OrderItemInput{{ProductID: "big-boss-burger", Quantity: 1}},
		DeliveryInfo:  domain.DeliveryInfo{AddressName: "Milimani, Kisumu", Phone: "+254700111111"},
		PaymentMethod: "mpesa",
	}
	orderBytes, _ := json.Marshal(orderPayload)
	wOrd := httptest.NewRecorder()
	reqOrd, _ := http.NewRequest(http.MethodPost, "/api/v1/orders", bytes.NewReader(orderBytes))
	reqOrd.Header.Set("Content-Type", "application/json")
	reqOrd.Header.Set("Authorization", "Bearer "+tokenA1)
	router.ServeHTTP(wOrd, reqOrd)
	require.Equal(t, http.StatusCreated, wOrd.Code)
	var ordResp httptransport.Response
	_ = json.Unmarshal(wOrd.Body.Bytes(), &ordResp)
	userAOrderID := ordResp.Data.(map[string]interface{})["id"].(string)

	// 2. User A logs in on Device 2 -> tokenA2 (must immediately invalidate tokenA1!)
	w2 := httptest.NewRecorder()
	req2, _ := http.NewRequest(http.MethodPost, "/api/v1/auth/login", bytes.NewReader(loginABytes))
	req2.Header.Set("Content-Type", "application/json")
	router.ServeHTTP(w2, req2)
	require.Equal(t, http.StatusOK, w2.Code)
	var resp2 httptransport.Response
	_ = json.Unmarshal(w2.Body.Bytes(), &resp2)
	tokenA2 := resp2.Data.(map[string]interface{})["token"].(string)

	// Device 1's tokenA1 must now be rejected with 401 Unauthorized (SESSION_REVOKED)
	wRevoked := httptest.NewRecorder()
	reqRevoked, _ := http.NewRequest(http.MethodGet, "/api/v1/profile", nil)
	reqRevoked.Header.Set("Authorization", "Bearer "+tokenA1)
	router.ServeHTTP(wRevoked, reqRevoked)
	assert.Equal(t, http.StatusUnauthorized, wRevoked.Code)
	assert.Contains(t, wRevoked.Body.String(), "SESSION_REVOKED")

	// Device 2's tokenA2 works normally
	wActive := httptest.NewRecorder()
	reqActive, _ := http.NewRequest(http.MethodGet, "/api/v1/profile", nil)
	reqActive.Header.Set("Authorization", "Bearer "+tokenA2)
	router.ServeHTTP(wActive, reqActive)
	assert.Equal(t, http.StatusOK, wActive.Code)

	// 3. Register & Login User B -> Must NEVER access User A's orders or tracking
	regB := domain.RegisterRequest{
		Name:     "User Two",
		Email:    "user2@kisumu.ke",
		Phone:    "+254700222222",
		Password: "PasswordB123!",
	}
	regBBytes, _ := json.Marshal(regB)
	wRegB := httptest.NewRecorder()
	reqRegB, _ := http.NewRequest(http.MethodPost, "/api/v1/auth/register", bytes.NewReader(regBBytes))
	reqRegB.Header.Set("Content-Type", "application/json")
	router.ServeHTTP(wRegB, reqRegB)
	require.Equal(t, http.StatusCreated, wRegB.Code)

	loginB := domain.LoginRequest{Identifier: "user2@kisumu.ke", Password: "PasswordB123!"}
	loginBBytes, _ := json.Marshal(loginB)
	wLoginB := httptest.NewRecorder()
	reqLoginB, _ := http.NewRequest(http.MethodPost, "/api/v1/auth/login", bytes.NewReader(loginBBytes))
	reqLoginB.Header.Set("Content-Type", "application/json")
	router.ServeHTTP(wLoginB, reqLoginB)
	require.Equal(t, http.StatusOK, wLoginB.Code)
	var respB httptransport.Response
	_ = json.Unmarshal(wLoginB.Body.Bytes(), &respB)
	tokenB := respB.Data.(map[string]interface{})["token"].(string)

	// User B attempts to read User A's order -> 403 Forbidden
	wCrossOrd := httptest.NewRecorder()
	reqCrossOrd, _ := http.NewRequest(http.MethodGet, "/api/v1/orders/"+userAOrderID, nil)
	reqCrossOrd.Header.Set("Authorization", "Bearer "+tokenB)
	router.ServeHTTP(wCrossOrd, reqCrossOrd)
	assert.Equal(t, http.StatusForbidden, wCrossOrd.Code)

	// User B attempts to read User A's order tracking -> 403 Forbidden
	wCrossTrack := httptest.NewRecorder()
	reqCrossTrack, _ := http.NewRequest(http.MethodGet, "/api/v1/orders/"+userAOrderID+"/tracking", nil)
	reqCrossTrack.Header.Set("Authorization", "Bearer "+tokenB)
	router.ServeHTTP(wCrossTrack, reqCrossTrack)
	assert.Equal(t, http.StatusForbidden, wCrossTrack.Code)

	// User B logs out -> tokenB immediately revoked
	wLogout := httptest.NewRecorder()
	reqLogout, _ := http.NewRequest(http.MethodPost, "/api/v1/auth/logout", nil)
	reqLogout.Header.Set("Authorization", "Bearer "+tokenB)
	router.ServeHTTP(wLogout, reqLogout)
	assert.Equal(t, http.StatusOK, wLogout.Code)

	wAfterLogout := httptest.NewRecorder()
	reqAfterLogout, _ := http.NewRequest(http.MethodGet, "/api/v1/profile", nil)
	reqAfterLogout.Header.Set("Authorization", "Bearer "+tokenB)
	router.ServeHTTP(wAfterLogout, reqAfterLogout)
	assert.Equal(t, http.StatusUnauthorized, wAfterLogout.Code)
}

func TestHTTP_RegisterAndCustomerLogin(t *testing.T) {
	router, _, _ := setupTestApp(t)

	// 1. Successful Customer Registration
	regReq := domain.RegisterRequest{
		Name:     "Grace Akinyi",
		Email:    "grace.akinyi@kisumu.ke",
		Phone:    "+254799112233",
		Password: "SecurePassword123!",
	}
	regBytes, _ := json.Marshal(regReq)

	w := httptest.NewRecorder()
	req, _ := http.NewRequest(http.MethodPost, "/api/v1/auth/register", bytes.NewReader(regBytes))
	req.Header.Set("Content-Type", "application/json")
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusCreated, w.Code)
	var regResp httptransport.Response
	err := json.Unmarshal(w.Body.Bytes(), &regResp)
	require.NoError(t, err)
	assert.True(t, regResp.Success)
	assert.Contains(t, w.Body.String(), "Registration successful")
	assert.Contains(t, w.Body.String(), "Grace Akinyi")

	// 2. Duplicate Registration -> 409 Conflict
	wDup := httptest.NewRecorder()
	reqDup, _ := http.NewRequest(http.MethodPost, "/api/v1/auth/register", bytes.NewReader(regBytes))
	reqDup.Header.Set("Content-Type", "application/json")
	router.ServeHTTP(wDup, reqDup)

	assert.Equal(t, http.StatusConflict, wDup.Code)
	assert.Contains(t, wDup.Body.String(), "already exists")

	// 3. Customer Password Login -> 200 OK with JWT
	loginReq := domain.LoginRequest{
		Identifier: "grace.akinyi@kisumu.ke",
		Password:   "SecurePassword123!",
	}
	loginBytes, _ := json.Marshal(loginReq)

	wLogin := httptest.NewRecorder()
	reqLogin, _ := http.NewRequest(http.MethodPost, "/api/v1/auth/login", bytes.NewReader(loginBytes))
	reqLogin.Header.Set("Content-Type", "application/json")
	router.ServeHTTP(wLogin, reqLogin)

	assert.Equal(t, http.StatusOK, wLogin.Code)
	var loginResp httptransport.Response
	err = json.Unmarshal(wLogin.Body.Bytes(), &loginResp)
	require.NoError(t, err)
	assert.True(t, loginResp.Success)
	dataMap := loginResp.Data.(map[string]interface{})
	assert.NotEmpty(t, dataMap["token"])
	assert.Equal(t, "Bearer", dataMap["tokenType"])

	// 4. Customer Login Wrong Password -> 401 Unauthorized
	badLoginReq := domain.LoginRequest{
		Identifier: "grace.akinyi@kisumu.ke",
		Password:   "WrongPassword!",
	}
	badLoginBytes, _ := json.Marshal(badLoginReq)

	wBad := httptest.NewRecorder()
	reqBad, _ := http.NewRequest(http.MethodPost, "/api/v1/auth/login", bytes.NewReader(badLoginBytes))
	reqBad.Header.Set("Content-Type", "application/json")
	router.ServeHTTP(wBad, reqBad)

	assert.Equal(t, http.StatusUnauthorized, wBad.Code)
}

func TestHTTP_AdminLogin2FAAndCommunications(t *testing.T) {
	router, cfg, _ := setupTestApp(t)

	// 1. Admin login on /api/v1/auth/login with admin credentials
	loginReq := domain.LoginRequest{
		Identifier: cfg.AdminEmail,
		Password:   cfg.AdminPassword,
	}
	loginBytes, _ := json.Marshal(loginReq)

	wLogin := httptest.NewRecorder()
	reqLogin, _ := http.NewRequest(http.MethodPost, "/api/v1/auth/login", bytes.NewReader(loginBytes))
	reqLogin.Header.Set("Content-Type", "application/json")
	router.ServeHTTP(wLogin, reqLogin)

	assert.Equal(t, http.StatusOK, wLogin.Code)
	var loginResp httptransport.Response
	err := json.Unmarshal(wLogin.Body.Bytes(), &loginResp)
	require.NoError(t, err)
	dataMap := loginResp.Data.(map[string]interface{})
	// Must require 2FA OTP!
	assert.True(t, dataMap["requiresOtp"].(bool))
	assert.Equal(t, domain.RoleAdmin, dataMap["role"].(string))
	assert.Empty(t, dataMap["token"]) // No token issued before OTP verification

	// 2. Request OTP for Admin via WhatsApp
	otpReq := domain.OTPRequest{
		Type:       "whatsapp",
		Identifier: "+254704769219",
	}
	otpBytes, _ := json.Marshal(otpReq)
	wOTP := httptest.NewRecorder()
	reqOTP, _ := http.NewRequest(http.MethodPost, "/api/v1/auth/otp/request", bytes.NewReader(otpBytes))
	reqOTP.Header.Set("Content-Type", "application/json")
	router.ServeHTTP(wOTP, reqOTP)
	assert.Equal(t, http.StatusOK, wOTP.Code)

	// 3. Admin Login endpoint to get admin token for testing admin APIs:
	adminLoginReq := domain.AdminLoginRequest{
		Email:    cfg.AdminEmail,
		Password: cfg.AdminPassword,
	}
	adminBytes, _ := json.Marshal(adminLoginReq)
	wAdmin := httptest.NewRecorder()
	reqAdmin, _ := http.NewRequest(http.MethodPost, "/api/v1/auth/admin/login", bytes.NewReader(adminBytes))
	reqAdmin.Header.Set("Content-Type", "application/json")
	router.ServeHTTP(wAdmin, reqAdmin)
	assert.Equal(t, http.StatusOK, wAdmin.Code)

	var adminResp httptransport.Response
	_ = json.Unmarshal(wAdmin.Body.Bytes(), &adminResp)
	adminData := adminResp.Data.(map[string]interface{})
	adminToken := adminData["token"].(string)

	// 4. Test Admin Orders with Search & Pagination
	wOrders := httptest.NewRecorder()
	reqOrders, _ := http.NewRequest(http.MethodGet, "/api/v1/admin/orders?page=1&limit=10", nil)
	reqOrders.Header.Set("Authorization", "Bearer "+adminToken)
	router.ServeHTTP(wOrders, reqOrders)
	assert.Equal(t, http.StatusOK, wOrders.Code)
	assert.Contains(t, wOrders.Body.String(), `"stats"`)

	// 5. Test Audience Calculation for Bulk Communications
	wAudience := httptest.NewRecorder()
	reqAudience, _ := http.NewRequest(http.MethodGet, "/api/v1/admin/communications/audience?channel=email", nil)
	reqAudience.Header.Set("Authorization", "Bearer "+adminToken)
	router.ServeHTTP(wAudience, reqAudience)
	assert.Equal(t, http.StatusOK, wAudience.Code)
	assert.Contains(t, wAudience.Body.String(), `"channel":"email"`)

	// 6. Test Sending Broadcast Communication
	bcastReq := domain.SendBroadcastRequest{
		Channel: "email",
		Subject: "Weekend Cold Brew Special",
		Message: "Enjoy 20% off all single-origin Kenyan cold brews this Saturday!",
	}
	bcastBytes, _ := json.Marshal(bcastReq)
	wBcast := httptest.NewRecorder()
	reqBcast, _ := http.NewRequest(http.MethodPost, "/api/v1/admin/communications/send", bytes.NewReader(bcastBytes))
	reqBcast.Header.Set("Authorization", "Bearer "+adminToken)
	reqBcast.Header.Set("Content-Type", "application/json")
	router.ServeHTTP(wBcast, reqBcast)
	assert.Equal(t, http.StatusOK, wBcast.Code)
	assert.Contains(t, wBcast.Body.String(), "Weekend Cold Brew Special")

	// 7. Test Admin Broadcast Logs
	wLogs := httptest.NewRecorder()
	reqLogs, _ := http.NewRequest(http.MethodGet, "/api/v1/admin/communications/logs", nil)
	reqLogs.Header.Set("Authorization", "Bearer "+adminToken)
	router.ServeHTTP(wLogs, reqLogs)
	assert.Equal(t, http.StatusOK, wLogs.Code)
	assert.Contains(t, wLogs.Body.String(), "Weekend Cold Brew Special")

	// 8. Test Admin Notifications
	wNotif := httptest.NewRecorder()
	reqNotif, _ := http.NewRequest(http.MethodGet, "/api/v1/admin/notifications", nil)
	reqNotif.Header.Set("Authorization", "Bearer "+adminToken)
	router.ServeHTTP(wNotif, reqNotif)
	assert.Equal(t, http.StatusOK, wNotif.Code)
	assert.Contains(t, wNotif.Body.String(), "Broadcast Sent")

	// 9. Test Public & Admin Specials
	wSpecials := httptest.NewRecorder()
	reqSpecials, _ := http.NewRequest(http.MethodGet, "/api/v1/menu/specials", nil)
	router.ServeHTTP(wSpecials, reqSpecials)
	assert.Equal(t, http.StatusOK, wSpecials.Code)
	assert.Contains(t, wSpecials.Body.String(), "18-Hour Cold Brews")
}
