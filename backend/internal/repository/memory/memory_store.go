package memory

import (
	"context"
	"fmt"
	"sync"

	"github.com/littlepolocafe/backend/internal/domain"
	"github.com/littlepolocafe/backend/internal/repository/postgres"
)

// MemoryUserRepo is a thread-safe in-memory user repository fallback.
type MemoryUserRepo struct {
	mu    sync.RWMutex
	users map[string]*domain.User
}

func NewMemoryUserRepo() *MemoryUserRepo {
	r := &MemoryUserRepo{
		users: make(map[string]*domain.User),
	}
	now := domain.NowEAT()
	r.users["usr-admin"] = &domain.User{
		ID:        "usr-admin",
		Name:      "Little Polo Cafe Owner",
		Initials:  "LPC",
		Phone:     "+254704769219",
		Email:     "mikewillmakeit2004@gmail.com",
		Role:      domain.RoleAdmin,
		CreatedAt: now,
		UpdatedAt: now,
	}
	r.users["usr-1"] = &domain.User{
		ID:        "usr-1",
		Name:      "Michael Clay",
		Initials:  "MC",
		Phone:     "+254 712 345 678",
		Email:     "michaelclay2225@gmail.com",
		Role:      domain.RoleCustomer,
		CreatedAt: now,
		UpdatedAt: now,
	}
	return r
}

func (r *MemoryUserRepo) Create(ctx context.Context, u *domain.User) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	now := domain.NowEAT()
	u.CreatedAt = now
	u.UpdatedAt = now
	copy := *u
	r.users[u.ID] = &copy
	return nil
}

func (r *MemoryUserRepo) GetByID(ctx context.Context, id string) (*domain.User, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	if u, ok := r.users[id]; ok {
		copy := *u
		return &copy, nil
	}
	return nil, postgres.ErrUserNotFound
}

func (r *MemoryUserRepo) GetByPhone(ctx context.Context, phone string) (*domain.User, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	for _, u := range r.users {
		if u.Phone == phone {
			copy := *u
			return &copy, nil
		}
	}
	return nil, postgres.ErrUserNotFound
}

func (r *MemoryUserRepo) GetByEmail(ctx context.Context, email string) (*domain.User, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	for _, u := range r.users {
		if u.Email == email {
			copy := *u
			return &copy, nil
		}
	}
	return nil, postgres.ErrUserNotFound
}

func (r *MemoryUserRepo) Update(ctx context.Context, u *domain.User) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	if _, ok := r.users[u.ID]; !ok {
		return postgres.ErrUserNotFound
	}
	u.UpdatedAt = domain.NowEAT()
	copy := *u
	r.users[u.ID] = &copy
	return nil
}

// MemoryProductRepo is a thread-safe in-memory product repository fallback.
type MemoryProductRepo struct {
	mu         sync.RWMutex
	categories []domain.Category
	products   map[string]*domain.Product
}

func NewMemoryProductRepo() *MemoryProductRepo {
	r := &MemoryProductRepo{
		products: make(map[string]*domain.Product),
	}
	r.seedData()
	return r
}

func (r *MemoryProductRepo) seedData() {
	now := domain.NowEAT()
	r.categories = []domain.Category{
		{ID: "burgers", Name: "Polo Burgers", Image: "cat-grid-1.png", DisplayOrder: 1, CreatedAt: now, UpdatedAt: now},
		{ID: "for-me", Name: "For Me", Image: "cat-grid-2.png", DisplayOrder: 2, CreatedAt: now, UpdatedAt: now},
		{ID: "for-us", Name: "For Us", Image: "cat-grid-3.png", DisplayOrder: 3, CreatedAt: now, UpdatedAt: now},
		{ID: "box-meals", Name: "Box Meals", Image: "cat-grid-4.png", DisplayOrder: 4, CreatedAt: now, UpdatedAt: now},
		{ID: "artisan-coffee", Name: "Artisan Coffee", Image: "cold-brew.jpg", DisplayOrder: 5, CreatedAt: now, UpdatedAt: now},
		{ID: "breakfast", Name: "Breakfast & Brunch", Image: "pancakes.jpg", DisplayOrder: 6, CreatedAt: now, UpdatedAt: now},
		{ID: "pastries", Name: "Pastries & Desserts", Image: "croissant.jpg", DisplayOrder: 7, CreatedAt: now, UpdatedAt: now},
		{ID: "drinks", Name: "Drinks", Image: "soda-2l.png", DisplayOrder: 8, CreatedAt: now, UpdatedAt: now},
	}

	prods := []domain.Product{
		{
			ID: "big-boss-burger", Name: "Big Boss Burger", Category: "burgers", Price: 850.00,
			Description: "Double grilled patties with melted cheese, fresh tomato, crisp lettuce, and Little Polo house relish.",
			Image: "burger-boss.png", HasOptions: true, IsAvailable: true, StockQuantity: 50, CreatedAt: now, UpdatedAt: now,
			OptionsGroup: &domain.ProductOptionGroup{
				ID: "burger-sauce", Title: "Choose Your Sauce", Required: true, Min: 1, Max: 1,
				Options: []domain.ProductOption{
					{ID: "house-relish", Name: "Little Polo House Relish", ExtraPrice: 0.00},
					{ID: "smoky-bbq", Name: "Smoky BBQ Sauce", ExtraPrice: 0.00},
					{ID: "spicy-mayo", Name: "Spicy Chili Mayo", ExtraPrice: 0.00},
				},
			},
		},
		{
			ID: "big-boss-burger-meal", Name: "Big Boss Burger Meal", Category: "burgers", Price: 1200.00,
			Description: "Big Boss Burger served with golden seasoned fries and a 500ml cold beverage.",
			Image: "burger-meal.png", HasOptions: true, IsAvailable: true, StockQuantity: 40, CreatedAt: now, UpdatedAt: now,
			OptionsGroup: &domain.ProductOptionGroup{
				ID: "meal-drink", Title: "Choose Your Meal Drink", Required: true, Min: 1, Max: 1,
				Options: []domain.ProductOption{
					{ID: "coke", Name: "Coke 500ml", ExtraPrice: 0.00},
					{ID: "fanta", Name: "Fanta Orange 500ml", ExtraPrice: 0.00},
					{ID: "sprite", Name: "Sprite 500ml", ExtraPrice: 0.00},
					{ID: "coke-500", Name: "Coke 500ml", ExtraPrice: 0.00},
					{ID: "fanta-500", Name: "Fanta Orange 500ml", ExtraPrice: 0.00},
					{ID: "sprite-500", Name: "Sprite 500ml", ExtraPrice: 0.00},
				},
			},
		},
		{
			ID: "colonel-burger", Name: "Colonel Burger", Category: "burgers", Price: 650.00,
			Description: "Crispy golden fried breast fillet with creamy mayo and crunchy iceberg lettuce on a toasted bun.",
			Image: "burger-colonel.png", HasOptions: false, IsAvailable: true, StockQuantity: 60, CreatedAt: now, UpdatedAt: now,
		},
		{
			ID: "crunch-burger", Name: "Crunch Burger", Category: "burgers", Price: 490.00,
			Description: "Crisp chicken patty with cheese slice and creamy garlic drizzle.",
			Image: "burger-crunch.png", HasOptions: false, IsAvailable: true, StockQuantity: 45, CreatedAt: now, UpdatedAt: now,
		},
		{
			ID: "streetwise-3-crunch", Name: "Streetwise 3 Crunch", Category: "for-me", Price: 650.00,
			Description: "3 succulent crispy chicken pieces with salted fries.",
			Image: "burger-crunch.png", HasOptions: false, IsAvailable: true, StockQuantity: 30, CreatedAt: now, UpdatedAt: now,
		},
		{
			ID: "nyama-nyama-burger", Name: "Nyama Nyama Burger", Category: "burgers", Price: 900.00,
			Description: "All-meat signature burger loaded with double bacon, caramelized onions, and cheddar melt.",
			Image: "burger-boss.png", HasOptions: false, IsAvailable: true, StockQuantity: 25, CreatedAt: now, UpdatedAt: now,
		},
		{
			ID: "2l-soda", Name: "2L Soda", Category: "drinks", Price: 350.00,
			Description: "Chilled 2 Liter refreshing beverage to share.",
			Image: "soda-2l.png", HasOptions: true, IsAvailable: true, StockQuantity: 100, CreatedAt: now, UpdatedAt: now,
			OptionsGroup: &domain.ProductOptionGroup{
				ID: "soda-flavor", Title: "Choose Your Soda Flavor", Required: true, Min: 1, Max: 1,
				Options: []domain.ProductOption{
					{ID: "coke", Name: "Coke", ExtraPrice: 0.00},
					{ID: "fanta-orange", Name: "Fanta Orange", ExtraPrice: 0.00},
					{ID: "sprite", Name: "Sprite", ExtraPrice: 0.00},
					{ID: "coke-2l", Name: "Coke", ExtraPrice: 0.00},
					{ID: "fanta-2l", Name: "Fanta Orange", ExtraPrice: 0.00},
					{ID: "sprite-2l", Name: "Sprite", ExtraPrice: 0.00},
				},
			},
		},
		{
			ID: "1l-soda", Name: "1l Soda", Category: "drinks", Price: 250.00,
			Description: "Chilled 1 Liter beverage.",
			Image: "soda-2l.png", HasOptions: true, IsAvailable: true, StockQuantity: 100, CreatedAt: now, UpdatedAt: now,
			OptionsGroup: &domain.ProductOptionGroup{
				ID: "soda-flavor-1l", Title: "Choose Your Soda Flavor", Required: true, Min: 1, Max: 1,
				Options: []domain.ProductOption{
					{ID: "coke", Name: "Coke", ExtraPrice: 0.00},
					{ID: "fanta-orange", Name: "Fanta Orange", ExtraPrice: 0.00},
					{ID: "sprite", Name: "Sprite", ExtraPrice: 0.00},
					{ID: "coke-1l", Name: "Coke", ExtraPrice: 0.00},
					{ID: "fanta-1l", Name: "Fanta Orange", ExtraPrice: 0.00},
					{ID: "sprite-1l", Name: "Sprite", ExtraPrice: 0.00},
				},
			},
		},
		{
			ID: "500ml-soda", Name: "500ml Soda", Category: "drinks", Price: 150.00,
			Description: "Chilled 500ml single serve bottle.",
			Image: "soda-2l.png", HasOptions: true, IsAvailable: true, StockQuantity: 120, CreatedAt: now, UpdatedAt: now,
			OptionsGroup: &domain.ProductOptionGroup{
				ID: "soda-flavor-500ml", Title: "Choose Your Soda Flavor", Required: true, Min: 1, Max: 1,
				Options: []domain.ProductOption{
					{ID: "coke", Name: "Coke", ExtraPrice: 0.00},
					{ID: "fanta-orange", Name: "Fanta Orange", ExtraPrice: 0.00},
					{ID: "sprite", Name: "Sprite", ExtraPrice: 0.00},
					{ID: "coke-500ml", Name: "Coke", ExtraPrice: 0.00},
					{ID: "fanta-500ml", Name: "Fanta Orange", ExtraPrice: 0.00},
					{ID: "sprite-500ml", Name: "Sprite", ExtraPrice: 0.00},
				},
			},
		},
		{
			ID: "350ml-soda", Name: "350ml Soda", Category: "drinks", Price: 100.00,
			Description: "Pocket size refreshing cold soda.",
			Image: "soda-2l.png", HasOptions: true, IsAvailable: true, StockQuantity: 150, CreatedAt: now, UpdatedAt: now,
			OptionsGroup: &domain.ProductOptionGroup{
				ID: "soda-flavor-350ml", Title: "Choose Your Soda Flavor", Required: true, Min: 1, Max: 1,
				Options: []domain.ProductOption{
					{ID: "coke", Name: "Coke", ExtraPrice: 0.00},
					{ID: "fanta-orange", Name: "Fanta Orange", ExtraPrice: 0.00},
					{ID: "sprite", Name: "Sprite", ExtraPrice: 0.00},
					{ID: "coke-350ml", Name: "Coke", ExtraPrice: 0.00},
					{ID: "fanta-350ml", Name: "Fanta Orange", ExtraPrice: 0.00},
					{ID: "sprite-350ml", Name: "Sprite", ExtraPrice: 0.00},
				},
			},
		},
		{
			ID: "cold-brew-vanilla", Name: "Cold Brew Vanilla Sweet Cream", Category: "artisan-coffee", Price: 450.00,
			Description: "18-hour slow-steeped Kenyan single origin coffee finished with handcrafted vanilla sweet cream.",
			Image: "cold-brew.jpg", HasOptions: true, IsAvailable: true, StockQuantity: 35, CreatedAt: now, UpdatedAt: now,
			OptionsGroup: &domain.ProductOptionGroup{
				ID: "milk-choice", Title: "Choose Your Milk Preference", Required: true, Min: 1, Max: 1,
				Options: []domain.ProductOption{
					{ID: "whole-milk", Name: "Fresh Whole Milk", ExtraPrice: 0.00},
					{ID: "oat-milk", Name: "Oat Milk", ExtraPrice: 0.00},
					{ID: "almond-milk", Name: "Almond Milk", ExtraPrice: 0.00},
				},
			},
		},
		{
			ID: "spanish-latte", Name: "Iced Spanish Latte", Category: "artisan-coffee", Price: 420.00,
			Description: "Espresso poured over condensed milk and chilled fresh milk.",
			Image: "latte.jpg", HasOptions: false, IsAvailable: true, StockQuantity: 40, CreatedAt: now, UpdatedAt: now,
		},
		{
			ID: "pancake-stack", Name: "Fluffy Buttermilk Pancake Stack", Category: "breakfast", Price: 600.00,
			Description: "Triple stack served with pure butter, Kisumu wildflower honey, and wild berries.",
			Image: "pancakes.jpg", HasOptions: false, IsAvailable: true, StockQuantity: 20, CreatedAt: now, UpdatedAt: now,
		},
		{
			ID: "flaky-croissant", Name: "Butter Flaky Croissant", Category: "pastries", Price: 280.00,
			Description: "Golden laminated pastry freshly baked every morning.",
			Image: "croissant.jpg", HasOptions: false, IsAvailable: true, StockQuantity: 30, CreatedAt: now, UpdatedAt: now,
		},
		{
			ID: "polo-solo-box", Name: "Polo Solo Feast Box", Category: "box-meals", Price: 1100.00,
			Description: "Big Boss Burger, 2 crispy wings, large fries, and 500ml soda.",
			Image: "cat-grid-4.png", HasOptions: false, IsAvailable: true, StockQuantity: 25, CreatedAt: now, UpdatedAt: now,
		},
		{
			ID: "lake-sharing-box", Name: "Lake Breeze Sharing Box", Category: "for-us", Price: 2400.00,
			Description: "4 Burgers, 8 crispy tenders, family fries, and 2L soda.",
			Image: "cat-grid-3.png", HasOptions: false, IsAvailable: true, StockQuantity: 15, CreatedAt: now, UpdatedAt: now,
		},
	}

	for _, p := range prods {
		copy := p
		r.products[p.ID] = &copy
	}
}

func (r *MemoryProductRepo) GetAllCategories(ctx context.Context) ([]domain.Category, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	return r.categories, nil
}

func (r *MemoryProductRepo) GetAllProducts(ctx context.Context) ([]domain.Product, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	var list []domain.Product
	for _, p := range r.products {
		list = append(list, *p)
	}
	return list, nil
}

func (r *MemoryProductRepo) GetProductByID(ctx context.Context, id string) (*domain.Product, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	if p, ok := r.products[id]; ok {
		copy := *p
		return &copy, nil
	}
	return nil, postgres.ErrProductNotFound
}

func (r *MemoryProductRepo) UpdateStock(ctx context.Context, id string, isAvailable *bool, stockQty *int) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	p, ok := r.products[id]
	if !ok {
		return postgres.ErrProductNotFound
	}
	if isAvailable != nil {
		p.IsAvailable = *isAvailable
	}
	if stockQty != nil {
		p.StockQuantity = *stockQty
	}
	p.UpdatedAt = domain.NowEAT()
	return nil
}

func (r *MemoryProductRepo) CreateProduct(ctx context.Context, p *domain.Product) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	now := domain.NowEAT()
	p.CreatedAt = now
	p.UpdatedAt = now
	copy := *p
	r.products[p.ID] = &copy
	return nil
}

func (r *MemoryProductRepo) DeleteProduct(ctx context.Context, id string) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	if _, ok := r.products[id]; !ok {
		return postgres.ErrProductNotFound
	}
	delete(r.products, id)
	return nil
}

// MemoryOrderRepo is a thread-safe in-memory order repository fallback.
type MemoryOrderRepo struct {
	mu          sync.RWMutex
	orders      map[string]*domain.Order
	tracking    map[string]*domain.OrderTracking
	productRepo *MemoryProductRepo
}

func NewMemoryOrderRepo(productRepo *MemoryProductRepo) *MemoryOrderRepo {
	return &MemoryOrderRepo{
		orders:      make(map[string]*domain.Order),
		tracking:    make(map[string]*domain.OrderTracking),
		productRepo: productRepo,
	}
}

func (r *MemoryOrderRepo) CreateOrderAtomic(ctx context.Context, order *domain.Order) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	// Out-of-stock guard check
	if r.productRepo != nil {
		r.productRepo.mu.Lock()
		for _, item := range order.Items {
			p, ok := r.productRepo.products[item.ProductID]
			if !ok {
				r.productRepo.mu.Unlock()
				return fmt.Errorf("product not found: %s", item.ProductID)
			}
			if !p.IsAvailable {
				r.productRepo.mu.Unlock()
				return postgres.UnavailableProductError{ProductID: p.ID, ProductName: p.Name}
			}
			if p.StockQuantity != -1 && p.StockQuantity < item.Quantity {
				r.productRepo.mu.Unlock()
				return postgres.OutOfStockError{ProductID: p.ID, ProductName: p.Name, Requested: item.Quantity, Available: p.StockQuantity}
			}
		}
		// Decrement
		for _, item := range order.Items {
			p := r.productRepo.products[item.ProductID]
			if p.StockQuantity != -1 {
				p.StockQuantity -= item.Quantity
			}
		}
		r.productRepo.mu.Unlock()
	}

	now := domain.NowEAT()
	order.CreatedAt = now
	order.UpdatedAt = now

	tracking := &domain.OrderTracking{
		OrderID:                  order.ID,
		Status:                   order.Status,
		StatusStep:               1,
		TotalSteps:               5,
		EstimatedDeliveryMinutes: order.EstimatedDeliveryMinutes,
		Timeline: []domain.TrackingStep{
			{Status: domain.OrderStatusPending, Label: "Order Placed", Completed: true, Time: &now},
			{Status: domain.OrderStatusConfirmed, Label: "Confirmed by Cafe", Completed: false},
			{Status: domain.OrderStatusPreparing, Label: "Kitchen Preparing", Completed: false},
			{Status: domain.OrderStatusOutForDelivery, Label: "Courier Dispatched", Completed: false},
			{Status: domain.OrderStatusDelivered, Label: "Delivered", Completed: false},
		},
		UpdatedAt: now,
	}

	copyOrder := *order
	r.orders[order.ID] = &copyOrder
	r.tracking[order.ID] = tracking
	return nil
}

func (r *MemoryOrderRepo) GetOrderByID(ctx context.Context, id string) (*domain.Order, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	if o, ok := r.orders[id]; ok {
		copy := *o
		return &copy, nil
	}
	return nil, postgres.ErrOrderNotFound
}

func (r *MemoryOrderRepo) GetOrdersByUserID(ctx context.Context, userID string) ([]domain.Order, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	var list []domain.Order
	for _, o := range r.orders {
		if o.UserID == userID {
			list = append(list, *o)
		}
	}
	return list, nil
}

func (r *MemoryOrderRepo) GetAllOrders(ctx context.Context, statusFilter *domain.OrderStatus) ([]domain.Order, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	var list []domain.Order
	for _, o := range r.orders {
		if statusFilter == nil || o.Status == *statusFilter {
			list = append(list, *o)
		}
	}
	return list, nil
}

func (r *MemoryOrderRepo) UpdateOrderStatus(ctx context.Context, orderID string, status domain.OrderStatus, label string, stepIndex int) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	order, ok := r.orders[orderID]
	if !ok {
		return postgres.ErrOrderNotFound
	}
	order.Status = status
	order.UpdatedAt = domain.NowEAT()

	if t, ok := r.tracking[orderID]; ok {
		t.Status = status
		t.StatusStep = stepIndex
		t.UpdatedAt = domain.NowEAT()
		now := domain.NowEAT()
		for i := range t.Timeline {
			if (i + 1) <= stepIndex {
				t.Timeline[i].Completed = true
				if t.Timeline[i].Time == nil {
					t.Timeline[i].Time = &now
				}
			}
		}
	}
	return nil
}

func (r *MemoryOrderRepo) UpdateCourier(ctx context.Context, orderID string, courierName string, courierPhone string, lat, lng *float64, eta int) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	order, ok := r.orders[orderID]
	if !ok {
		return postgres.ErrOrderNotFound
	}
	var courierLoc *domain.Coordinates
	if lat != nil && lng != nil {
		courierLoc = &domain.Coordinates{Lat: *lat, Lng: *lng}
	}
	order.Courier = &domain.CourierInfo{
		Name:     courierName,
		Phone:    courierPhone,
		Location: courierLoc,
	}
	order.EstimatedDeliveryMinutes = eta
	order.UpdatedAt = domain.NowEAT()

	if t, ok := r.tracking[orderID]; ok {
		t.Courier = order.Courier
		t.EstimatedDeliveryMinutes = eta
		t.UpdatedAt = domain.NowEAT()
	}
	return nil
}

func (r *MemoryOrderRepo) UpdateCourierLocation(ctx context.Context, orderID string, lat, lng float64) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	order, ok := r.orders[orderID]
	if !ok {
		return postgres.ErrOrderNotFound
	}
	if order.Courier != nil {
		order.Courier.Location = &domain.Coordinates{Lat: lat, Lng: lng}
	}
	order.UpdatedAt = domain.NowEAT()

	if t, ok := r.tracking[orderID]; ok {
		if t.Courier != nil {
			t.Courier.Location = &domain.Coordinates{Lat: lat, Lng: lng}
		}
		t.UpdatedAt = domain.NowEAT()
	}
	return nil
}

func (r *MemoryOrderRepo) GetOrderTracking(ctx context.Context, orderID string) (*domain.OrderTracking, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	if t, ok := r.tracking[orderID]; ok {
		copy := *t
		return &copy, nil
	}
	return nil, postgres.ErrOrderNotFound
}

// MemoryActivityRepo is a thread-safe in-memory activity repository fallback.
type MemoryActivityRepo struct {
	mu         sync.RWMutex
	activities map[string]*domain.Activity
}

func NewMemoryActivityRepo() *MemoryActivityRepo {
	r := &MemoryActivityRepo{
		activities: make(map[string]*domain.Activity),
	}
	now := domain.NowEAT()
	act1 := domain.Activity{
		ID:             "act-paint-sip",
		Title:          "Sunday Paint & Sip at Little Polo",
		Subtitle:       "Join our weekly afternoon creative session with easel, paints, canvas, and handcrafted iced coffee.",
		Schedule:       "Every Sunday · 2:00 PM – 5:00 PM",
		Price:          1500.00,
		Location:       "Little Polo Cafe Garden Terrace, Kisumu",
		WhatsAppNumber: "+254704769219",
		Image:          "cold-brew.jpg",
		IsActive:       true,
		CreatedAt:      now,
		UpdatedAt:      now,
	}
	r.activities[act1.ID] = &act1
	return r
}

func (r *MemoryActivityRepo) GetAllActivities(ctx context.Context) ([]domain.Activity, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	var list []domain.Activity
	for _, a := range r.activities {
		if a.IsActive {
			list = append(list, *a)
		}
	}
	return list, nil
}

func (r *MemoryActivityRepo) GetActivityByID(ctx context.Context, id string) (*domain.Activity, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	if a, ok := r.activities[id]; ok {
		copy := *a
		return &copy, nil
	}
	return nil, domain.ErrActivityNotFound
}
