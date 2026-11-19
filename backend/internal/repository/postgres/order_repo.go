package postgres

import (
	"context"
	"errors"
	"fmt"
	"sort"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/littlepolocafe/backend/internal/domain"
)

var (
	ErrOrderNotFound      = errors.New("order not found")
	ErrDuplicateIdempotency = errors.New("duplicate idempotency key")
)

type OutOfStockError struct {
	ProductID   string
	ProductName string
	Requested   int
	Available   int
}

func (e OutOfStockError) Error() string {
	return fmt.Sprintf("out of stock: product %s (%s) requested %d but only %d available",
		e.ProductName, e.ProductID, e.Requested, e.Available)
}

type UnavailableProductError struct {
	ProductID   string
	ProductName string
}

func (e UnavailableProductError) Error() string {
	return fmt.Sprintf("product currently unavailable: %s (%s)", e.ProductName, e.ProductID)
}

type OrderRepository struct {
	pool PoolIface
}

func NewOrderRepository(pool PoolIface) *OrderRepository {
	return &OrderRepository{pool: pool}
}

// CreateOrderAtomic executes an atomic database transaction with pessimistic locking (FOR UPDATE)
// to guarantee out-of-stock guard enforcement and ACID order creation.
func (r *OrderRepository) CreateOrderAtomic(ctx context.Context, order *domain.Order) error {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return fmt.Errorf("failed to begin transaction: %w", err)
	}
	defer tx.Rollback(ctx)

	// Step 1: Out-of-stock guard & stock decrement with deterministic row-level locks
	// Aggregate quantities by product ID and sort IDs ascending to mathematically prevent database deadlocks.
	itemTotals := make(map[string]int)
	for _, item := range order.Items {
		itemTotals[item.ProductID] += item.Quantity
	}

	sortedProductIDs := make([]string, 0, len(itemTotals))
	for pid := range itemTotals {
		sortedProductIDs = append(sortedProductIDs, pid)
	}
	sort.Strings(sortedProductIDs)

	for _, pid := range sortedProductIDs {
		requestedQty := itemTotals[pid]
		queryCheck := `
			SELECT name, is_available, stock_quantity
			FROM products
			WHERE id = $1
			FOR UPDATE
		`
		var name string
		var isAvailable bool
		var stockQty int
		err := tx.QueryRow(ctx, queryCheck, pid).Scan(&name, &isAvailable, &stockQty)
		if errors.Is(err, pgx.ErrNoRows) {
			return fmt.Errorf("product not found: %s", pid)
		}
		if err != nil {
			return fmt.Errorf("failed to query product for locking: %w", err)
		}

		if !isAvailable {
			return UnavailableProductError{
				ProductID:   pid,
				ProductName: name,
			}
		}

		// -1 signifies unlimited stock
		if stockQty != -1 && stockQty < requestedQty {
			return OutOfStockError{
				ProductID:   pid,
				ProductName: name,
				Requested:   requestedQty,
				Available:   stockQty,
			}
		}

		// Decrement stock if finite
		if stockQty != -1 {
			queryUpdateStock := `
				UPDATE products
				SET stock_quantity = stock_quantity - $1,
				    updated_at = $2
				WHERE id = $3
			`
			_, err = tx.Exec(ctx, queryUpdateStock, requestedQty, time.Now(), pid)
			if err != nil {
				return fmt.Errorf("failed to decrement product stock: %w", err)
			}
		}
	}

	// Step 2: Insert Order
	now := time.Now()
	queryOrder := `
		INSERT INTO orders (
			id, user_id, status, subtotal, delivery_fee, vat, total,
			payment_method, payment_status, address_name, landmark, estate_building,
			delivery_instructions, phone, save_address, estimated_delivery_minutes,
			idempotency_key, created_at, updated_at
		) VALUES (
			$1, $2, $3, $4, $5, $6, $7,
			$8, $9, $10, $11, $12,
			$13, $14, $15, $16,
			$17, $18, $19
		)
	`
	_, err = tx.Exec(ctx, queryOrder,
		order.ID,
		order.UserID,
		order.Status,
		order.Subtotal,
		order.DeliveryFee,
		order.VAT,
		order.Total,
		order.PaymentMethod,
		order.PaymentStatus,
		order.DeliveryInfo.AddressName,
		order.DeliveryInfo.Landmark,
		order.DeliveryInfo.EstateBuilding,
		order.DeliveryInfo.DeliveryInstructions,
		order.DeliveryInfo.Phone,
		order.DeliveryInfo.SaveAddress,
		order.EstimatedDeliveryMinutes,
		order.IdempotencyKey,
		now,
		now,
	)
	if err != nil {
		return fmt.Errorf("failed to insert order: %w", err)
	}

	// Step 3: Insert Order Items
	queryItem := `
		INSERT INTO order_items (
			id, order_id, product_id, product_name, option_id, option_name,
			quantity, unit_price, option_price, total_price
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
	`
	for i := range order.Items {
		item := &order.Items[i]
		if item.ID == "" {
			item.ID = uuid.NewString()
		}
		item.OrderID = order.ID
		_, err = tx.Exec(ctx, queryItem,
			item.ID,
			item.OrderID,
			item.ProductID,
			item.ProductName,
			item.OptionID,
			item.OptionName,
			item.Quantity,
			item.UnitPrice,
			item.OptionPrice,
			item.TotalPrice,
		)
		if err != nil {
			return fmt.Errorf("failed to insert order item: %w", err)
		}
	}

	// Step 4: Insert Initial Tracking Step (PENDING)
	queryTracking := `
		INSERT INTO order_tracking_steps (
			id, order_id, status, label, step_index, completed, timestamp
		) VALUES ($1, $2, $3, $4, $5, $6, $7)
	`
	_, err = tx.Exec(ctx, queryTracking,
		uuid.NewString(),
		order.ID,
		domain.OrderStatusPending,
		"Order Placed",
		1,
		true,
		now,
	)
	if err != nil {
		return fmt.Errorf("failed to insert initial tracking step: %w", err)
	}

	// Step 5: Commit Atomic Transaction
	if err := tx.Commit(ctx); err != nil {
		return fmt.Errorf("failed to commit order transaction: %w", err)
	}

	order.CreatedAt = domain.ToEAT(now)
	order.UpdatedAt = domain.ToEAT(now)
	return nil
}

func (r *OrderRepository) GetOrderByID(ctx context.Context, id string) (*domain.Order, error) {
	query := `
		SELECT id, user_id, status, subtotal, delivery_fee, vat, total,
		       payment_method, payment_status, address_name, landmark, estate_building,
		       delivery_instructions, phone, save_address, courier_name, courier_phone,
		       courier_lat, courier_lng, estimated_delivery_minutes, idempotency_key,
		       created_at, updated_at
		FROM orders
		WHERE id = $1
	`
	var o domain.Order
	var courierName, courierPhone *string
	var courierLat, courierLng *float64
	var createdAt, updatedAt time.Time

	err := r.pool.QueryRow(ctx, query, id).Scan(
		&o.ID,
		&o.UserID,
		&o.Status,
		&o.Subtotal,
		&o.DeliveryFee,
		&o.VAT,
		&o.Total,
		&o.PaymentMethod,
		&o.PaymentStatus,
		&o.DeliveryInfo.AddressName,
		&o.DeliveryInfo.Landmark,
		&o.DeliveryInfo.EstateBuilding,
		&o.DeliveryInfo.DeliveryInstructions,
		&o.DeliveryInfo.Phone,
		&o.DeliveryInfo.SaveAddress,
		&courierName,
		&courierPhone,
		&courierLat,
		&courierLng,
		&o.EstimatedDeliveryMinutes,
		&o.IdempotencyKey,
		&createdAt,
		&updatedAt,
	)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrOrderNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("failed to get order: %w", err)
	}

	o.CreatedAt = domain.ToEAT(createdAt)
	o.UpdatedAt = domain.ToEAT(updatedAt)

	if courierName != nil && courierPhone != nil {
		o.Courier = &domain.CourierInfo{
			Name:  *courierName,
			Phone: *courierPhone,
		}
		if courierLat != nil && courierLng != nil {
			o.Courier.Location = &domain.Coordinates{
				Lat: *courierLat,
				Lng: *courierLng,
			}
		}
	}

	items, err := r.getOrderItems(ctx, o.ID)
	if err != nil {
		return nil, err
	}
	o.Items = items

	return &o, nil
}

func (r *OrderRepository) GetOrdersByUserID(ctx context.Context, userID string) ([]domain.Order, error) {
	query := `
		SELECT id, user_id, status, subtotal, delivery_fee, vat, total,
		       payment_method, payment_status, address_name, landmark, estate_building,
		       delivery_instructions, phone, save_address, courier_name, courier_phone,
		       courier_lat, courier_lng, estimated_delivery_minutes, idempotency_key,
		       created_at, updated_at
		FROM orders
		WHERE user_id = $1
		ORDER BY created_at DESC
	`
	rows, err := r.pool.Query(ctx, query, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to query user orders: %w", err)
	}
	defer rows.Close()

	var orders []domain.Order
	for rows.Next() {
		var o domain.Order
		var courierName, courierPhone *string
		var courierLat, courierLng *float64
		var createdAt, updatedAt time.Time

		if err := rows.Scan(
			&o.ID,
			&o.UserID,
			&o.Status,
			&o.Subtotal,
			&o.DeliveryFee,
			&o.VAT,
			&o.Total,
			&o.PaymentMethod,
			&o.PaymentStatus,
			&o.DeliveryInfo.AddressName,
			&o.DeliveryInfo.Landmark,
			&o.DeliveryInfo.EstateBuilding,
			&o.DeliveryInfo.DeliveryInstructions,
			&o.DeliveryInfo.Phone,
			&o.DeliveryInfo.SaveAddress,
			&courierName,
			&courierPhone,
			&courierLat,
			&courierLng,
			&o.EstimatedDeliveryMinutes,
			&o.IdempotencyKey,
			&createdAt,
			&updatedAt,
		); err != nil {
			return nil, err
		}

		o.CreatedAt = domain.ToEAT(createdAt)
		o.UpdatedAt = domain.ToEAT(updatedAt)

		if courierName != nil && courierPhone != nil {
			o.Courier = &domain.CourierInfo{
				Name:  *courierName,
				Phone: *courierPhone,
			}
			if courierLat != nil && courierLng != nil {
				o.Courier.Location = &domain.Coordinates{
					Lat: *courierLat,
					Lng: *courierLng,
				}
			}
		}

		orders = append(orders, o)
	}
	rows.Close()

	// Batch fetch all order items in a single query instead of N+1
	if len(orders) > 0 {
		orderIDs := make([]string, len(orders))
		for i, o := range orders {
			orderIDs[i] = o.ID
		}

		itemsQuery := `
			SELECT id, order_id, product_id, product_name, option_id, option_name,
			       quantity, unit_price, option_price, total_price
			FROM order_items
			WHERE order_id = ANY($1)
		`
		iRows, err := r.pool.Query(ctx, itemsQuery, orderIDs)
		if err == nil {
			defer iRows.Close()
			itemsByOrder := make(map[string][]domain.OrderItem)
			for iRows.Next() {
				var it domain.OrderItem
				if err := iRows.Scan(
					&it.ID,
					&it.OrderID,
					&it.ProductID,
					&it.ProductName,
					&it.OptionID,
					&it.OptionName,
					&it.Quantity,
					&it.UnitPrice,
					&it.OptionPrice,
					&it.TotalPrice,
				); err == nil {
					itemsByOrder[it.OrderID] = append(itemsByOrder[it.OrderID], it)
				}
			}
			for i := range orders {
				if itList, ok := itemsByOrder[orders[i].ID]; ok {
					orders[i].Items = itList
				} else {
					orders[i].Items = []domain.OrderItem{}
				}
			}
		}
	}

	return orders, nil
}

func (r *OrderRepository) GetAllOrders(ctx context.Context, statusFilter *domain.OrderStatus) ([]domain.Order, error) {
	query := `
		SELECT id, user_id, status, subtotal, delivery_fee, vat, total,
		       payment_method, payment_status, address_name, landmark, estate_building,
		       delivery_instructions, phone, save_address, courier_name, courier_phone,
		       courier_lat, courier_lng, estimated_delivery_minutes, idempotency_key,
		       created_at, updated_at
		FROM orders
	`
	var args []interface{}
	if statusFilter != nil {
		query += " WHERE status = $1"
		args = append(args, *statusFilter)
	}
	query += " ORDER BY created_at DESC"

	rows, err := r.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("failed to query all orders: %w", err)
	}
	defer rows.Close()

	var orders []domain.Order
	for rows.Next() {
		var o domain.Order
		var courierName, courierPhone *string
		var courierLat, courierLng *float64
		var createdAt, updatedAt time.Time

		if err := rows.Scan(
			&o.ID,
			&o.UserID,
			&o.Status,
			&o.Subtotal,
			&o.DeliveryFee,
			&o.VAT,
			&o.Total,
			&o.PaymentMethod,
			&o.PaymentStatus,
			&o.DeliveryInfo.AddressName,
			&o.DeliveryInfo.Landmark,
			&o.DeliveryInfo.EstateBuilding,
			&o.DeliveryInfo.DeliveryInstructions,
			&o.DeliveryInfo.Phone,
			&o.DeliveryInfo.SaveAddress,
			&courierName,
			&courierPhone,
			&courierLat,
			&courierLng,
			&o.EstimatedDeliveryMinutes,
			&o.IdempotencyKey,
			&createdAt,
			&updatedAt,
		); err != nil {
			return nil, err
		}

		o.CreatedAt = domain.ToEAT(createdAt)
		o.UpdatedAt = domain.ToEAT(updatedAt)

		if courierName != nil && courierPhone != nil {
			o.Courier = &domain.CourierInfo{
				Name:  *courierName,
				Phone: *courierPhone,
			}
			if courierLat != nil && courierLng != nil {
				o.Courier.Location = &domain.Coordinates{
					Lat: *courierLat,
					Lng: *courierLng,
				}
			}
		}

		orders = append(orders, o)
	}
	rows.Close()

	// Batch fetch all order items in a single query instead of N+1
	if len(orders) > 0 {
		orderIDs := make([]string, len(orders))
		for i, o := range orders {
			orderIDs[i] = o.ID
		}

		itemsQuery := `
			SELECT id, order_id, product_id, product_name, option_id, option_name,
			       quantity, unit_price, option_price, total_price
			FROM order_items
			WHERE order_id = ANY($1)
		`
		iRows, err := r.pool.Query(ctx, itemsQuery, orderIDs)
		if err == nil {
			defer iRows.Close()
			itemsByOrder := make(map[string][]domain.OrderItem)
			for iRows.Next() {
				var it domain.OrderItem
				if err := iRows.Scan(
					&it.ID,
					&it.OrderID,
					&it.ProductID,
					&it.ProductName,
					&it.OptionID,
					&it.OptionName,
					&it.Quantity,
					&it.UnitPrice,
					&it.OptionPrice,
					&it.TotalPrice,
				); err == nil {
					itemsByOrder[it.OrderID] = append(itemsByOrder[it.OrderID], it)
				}
			}
			for i := range orders {
				if itList, ok := itemsByOrder[orders[i].ID]; ok {
					orders[i].Items = itList
				} else {
					orders[i].Items = []domain.OrderItem{}
				}
			}
		}
	}

	return orders, nil
}

func (r *OrderRepository) getOrderItems(ctx context.Context, orderID string) ([]domain.OrderItem, error) {
	query := `
		SELECT id, order_id, product_id, product_name, option_id, option_name,
		       quantity, unit_price, option_price, total_price
		FROM order_items
		WHERE order_id = $1
	`
	rows, err := r.pool.Query(ctx, query, orderID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var items []domain.OrderItem
	for rows.Next() {
		var it domain.OrderItem
		if err := rows.Scan(
			&it.ID,
			&it.OrderID,
			&it.ProductID,
			&it.ProductName,
			&it.OptionID,
			&it.OptionName,
			&it.Quantity,
			&it.UnitPrice,
			&it.OptionPrice,
			&it.TotalPrice,
		); err != nil {
			return nil, err
		}
		items = append(items, it)
	}
	return items, nil
}

func (r *OrderRepository) UpdateOrderStatus(ctx context.Context, orderID string, status domain.OrderStatus, label string, stepIndex int) error {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	now := time.Now()
	_, err = tx.Exec(ctx, `UPDATE orders SET status = $1, updated_at = $2 WHERE id = $3`, status, now, orderID)
	if err != nil {
		return err
	}

	// Record or update tracking step
	trackingQuery := `
		INSERT INTO order_tracking_steps (id, order_id, status, label, step_index, completed, timestamp)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
	`
	_, err = tx.Exec(ctx, trackingQuery, uuid.NewString(), orderID, status, label, stepIndex, true, now)
	if err != nil {
		return err
	}

	return tx.Commit(ctx)
}

func (r *OrderRepository) UpdateCourier(ctx context.Context, orderID string, courierName string, courierPhone string, lat, lng *float64, eta int) error {
	now := time.Now()
	query := `
		UPDATE orders
		SET courier_name = $1,
		    courier_phone = $2,
		    courier_lat = COALESCE($3, courier_lat),
		    courier_lng = COALESCE($4, courier_lng),
		    estimated_delivery_minutes = CASE WHEN $5 > 0 THEN $5 ELSE estimated_delivery_minutes END,
		    updated_at = $6
		WHERE id = $7
	`
	res, err := r.pool.Exec(ctx, query, courierName, courierPhone, lat, lng, eta, now, orderID)
	if err != nil {
		return err
	}
	if res.RowsAffected() == 0 {
		return ErrOrderNotFound
	}
	return nil
}

func (r *OrderRepository) UpdateCourierLocation(ctx context.Context, orderID string, lat, lng float64) error {
	now := time.Now()
	query := `
		UPDATE orders
		SET courier_lat = $1,
		    courier_lng = $2,
		    updated_at = $3
		WHERE id = $4
	`
	res, err := r.pool.Exec(ctx, query, lat, lng, now, orderID)
	if err != nil {
		return err
	}
	if res.RowsAffected() == 0 {
		return ErrOrderNotFound
	}
	return nil
}

func (r *OrderRepository) GetOrderTracking(ctx context.Context, orderID string) (*domain.OrderTracking, error) {
	order, err := r.GetOrderByID(ctx, orderID)
	if err != nil {
		return nil, err
	}

	query := `
		SELECT status, label, step_index, completed, timestamp
		FROM order_tracking_steps
		WHERE order_id = $1
		ORDER BY step_index ASC
	`
	rows, err := r.pool.Query(ctx, query, orderID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var timeline []domain.TrackingStep
	for rows.Next() {
		var step domain.TrackingStep
		var stepIndex int
		var ts *time.Time
		if err := rows.Scan(&step.Status, &step.Label, &stepIndex, &step.Completed, &ts); err != nil {
			return nil, err
		}
		if ts != nil {
			eat := domain.ToEAT(*ts)
			step.Time = &eat
		}
		timeline = append(timeline, step)
	}

	stepNum := 1
	switch order.Status {
	case domain.OrderStatusPending:
		stepNum = 1
	case domain.OrderStatusConfirmed:
		stepNum = 2
	case domain.OrderStatusPreparing:
		stepNum = 3
	case domain.OrderStatusOutForDelivery:
		stepNum = 4
	case domain.OrderStatusDelivered:
		stepNum = 5
	}

	tracking := &domain.OrderTracking{
		OrderID:                  order.ID,
		Status:                   order.Status,
		StatusStep:               stepNum,
		TotalSteps:               5,
		EstimatedDeliveryMinutes: order.EstimatedDeliveryMinutes,
		Courier:                  order.Courier,
		Timeline:                 timeline,
		UpdatedAt:                order.UpdatedAt,
	}

	return tracking, nil
}
