package postgres

import (
	"context"
	"log"
	"os"

	"github.com/jackc/pgx/v5/pgxpool"
)

// SeedDatabase seeds the initial Little Polo Cafe data matching the mobile frontend.
func SeedDatabase(ctx context.Context, pool *pgxpool.Pool) error {
	log.Println("[Seeder] Checking and seeding Little Polo Cafe data...")

	adminEmail := os.Getenv("ADMIN_EMAIL")
	if adminEmail == "" {
		adminEmail = "admin@littlepolocafe.local"
	}

	// 1. Seed Users (Admin & Customer)
	userQueries := `
		INSERT INTO users (id, name, initials, phone, email, role, dob, created_at, updated_at)
		VALUES 
		('usr-admin', 'Little Polo Cafe Owner', 'LPC', '+254704769219', $1, 'admin', NULL, NOW(), NOW()),
		('usr-1', 'Michael Clay', 'MC', '+254 712 345 678', 'michaelclay2225@gmail.com', 'customer', NULL, NOW(), NOW())
		ON CONFLICT (id) DO NOTHING;
	`
	if _, err := pool.Exec(ctx, userQueries, adminEmail); err != nil {
		log.Printf("[Seeder Warning] User seed: %v", err)
	}

	// 2. Seed Categories
	categoryQueries := `
		INSERT INTO categories (id, name, image, display_order, created_at, updated_at)
		VALUES
		('burgers', 'Polo Burgers', 'cat-grid-1.png', 1, NOW(), NOW()),
		('for-me', 'For Me', 'cat-grid-2.png', 2, NOW(), NOW()),
		('for-us', 'For Us', 'cat-grid-3.png', 3, NOW(), NOW()),
		('box-meals', 'Box Meals', 'cat-grid-4.png', 4, NOW(), NOW()),
		('artisan-coffee', 'Artisan Coffee', 'cold-brew.jpg', 5, NOW(), NOW()),
		('breakfast', 'Breakfast & Brunch', 'pancakes.jpg', 6, NOW(), NOW()),
		('pastries', 'Pastries & Desserts', 'croissant.jpg', 7, NOW(), NOW()),
		('drinks', 'Drinks', 'soda-2l.png', 8, NOW(), NOW())
		ON CONFLICT (id) DO NOTHING;
	`
	if _, err := pool.Exec(ctx, categoryQueries); err != nil {
		log.Printf("[Seeder Warning] Category seed: %v", err)
	}

	// 3. Seed Products
	productQueries := `
		INSERT INTO products (id, name, category_id, price, description, image, has_options, is_available, stock_quantity, created_at, updated_at)
		VALUES
		('big-boss-burger', 'Big Boss Burger', 'burgers', 850.00, 'Double grilled patties with melted cheese, fresh tomato, crisp lettuce, and Little Polo house relish.', 'burger-boss.png', true, true, 50, NOW(), NOW()),
		('big-boss-burger-meal', 'Big Boss Burger Meal', 'burgers', 1200.00, 'Big Boss Burger served with golden seasoned fries and a 500ml cold beverage.', 'burger-meal.png', true, true, 40, NOW(), NOW()),
		('colonel-burger', 'Colonel Burger', 'burgers', 650.00, 'Crispy golden fried breast fillet with creamy mayo and crunchy iceberg lettuce on a toasted bun.', 'burger-colonel.png', false, true, 60, NOW(), NOW()),
		('crunch-burger', 'Crunch Burger', 'burgers', 490.00, 'Crisp chicken patty with cheese slice and creamy garlic drizzle.', 'burger-crunch.png', false, true, 45, NOW(), NOW()),
		('streetwise-3-crunch', 'Streetwise 3 Crunch', 'for-me', 650.00, '3 succulent crispy chicken pieces with salted fries.', 'burger-crunch.png', false, true, 30, NOW(), NOW()),
		('nyama-nyama-burger', 'Nyama Nyama Burger', 'burgers', 900.00, 'All-meat signature burger loaded with double bacon, caramelized onions, and cheddar melt.', 'burger-boss.png', false, true, 25, NOW(), NOW()),
		('2l-soda', '2L Soda', 'drinks', 350.00, 'Chilled 2 Liter refreshing beverage to share.', 'soda-2l.png', true, true, 100, NOW(), NOW()),
		('1l-soda', '1l Soda', 'drinks', 250.00, 'Chilled 1 Liter beverage.', 'soda-2l.png', true, true, 100, NOW(), NOW()),
		('500ml-soda', '500ml Soda', 'drinks', 150.00, 'Chilled 500ml single serve bottle.', 'soda-2l.png', true, true, 120, NOW(), NOW()),
		('350ml-soda', '350ml Soda', 'drinks', 100.00, 'Pocket size refreshing cold soda.', 'soda-2l.png', true, true, 150, NOW(), NOW()),
		('cold-brew-vanilla', 'Cold Brew Vanilla Sweet Cream', 'artisan-coffee', 450.00, '18-hour slow-steeped Kenyan single origin coffee finished with handcrafted vanilla sweet cream.', 'cold-brew.jpg', true, true, 35, NOW(), NOW()),
		('spanish-latte', 'Iced Spanish Latte', 'artisan-coffee', 420.00, 'Espresso poured over condensed milk and chilled fresh milk.', 'latte.jpg', false, true, 40, NOW(), NOW()),
		('pancake-stack', 'Fluffy Buttermilk Pancake Stack', 'breakfast', 600.00, 'Triple stack served with pure butter, Kisumu wildflower honey, and wild berries.', 'pancakes.jpg', false, true, 20, NOW(), NOW()),
		('flaky-croissant', 'Butter Flaky Croissant', 'pastries', 280.00, 'Golden laminated pastry freshly baked every morning.', 'croissant.jpg', false, true, 30, NOW(), NOW()),
		('polo-solo-box', 'Polo Solo Feast Box', 'box-meals', 1100.00, 'Big Boss Burger, 2 crispy wings, large fries, and 500ml soda.', 'cat-grid-4.png', false, true, 25, NOW(), NOW()),
		('lake-sharing-box', 'Lake Breeze Sharing Box', 'for-us', 2400.00, '4 Burgers, 8 crispy tenders, family fries, and 2L soda.', 'cat-grid-3.png', false, true, 15, NOW(), NOW())
		ON CONFLICT (id) DO NOTHING;
	`
	if _, err := pool.Exec(ctx, productQueries); err != nil {
		log.Printf("[Seeder Warning] Product seed: %v", err)
	}

	// 4. Seed Option Groups & Options
	optionGroupQueries := `
		INSERT INTO product_option_groups (id, product_id, title, required, min_select, max_select)
		VALUES
		('burger-sauce', 'big-boss-burger', 'Choose Your Sauce', true, 1, 1),
		('meal-drink', 'big-boss-burger-meal', 'Choose Your Meal Drink', true, 1, 1),
		('soda-flavor', '2l-soda', 'Choose Your Soda Flavor', true, 1, 1),
		('soda-flavor-1l', '1l-soda', 'Choose Your Soda Flavor', true, 1, 1),
		('soda-flavor-500ml', '500ml-soda', 'Choose Your Soda Flavor', true, 1, 1),
		('soda-flavor-350ml', '350ml-soda', 'Choose Your Soda Flavor', true, 1, 1),
		('milk-choice', 'cold-brew-vanilla', 'Choose Your Milk Preference', true, 1, 1)
		ON CONFLICT (id) DO NOTHING;

		INSERT INTO product_options (id, option_group_id, name, extra_price)
		VALUES
		('house-relish', 'burger-sauce', 'Little Polo House Relish', 0.00),
		('smoky-bbq', 'burger-sauce', 'Smoky BBQ Sauce', 0.00),
		('spicy-mayo', 'burger-sauce', 'Spicy Chili Mayo', 0.00),
		('coke-500', 'meal-drink', 'Coke 500ml', 0.00),
		('fanta-500', 'meal-drink', 'Fanta Orange 500ml', 0.00),
		('sprite-500', 'meal-drink', 'Sprite 500ml', 0.00),
		('coke-2l', 'soda-flavor', 'Coke', 0.00),
		('fanta-2l', 'soda-flavor', 'Fanta Orange', 0.00),
		('sprite-2l', 'soda-flavor', 'Sprite', 0.00),
		('coke-1l', 'soda-flavor-1l', 'Coke', 0.00),
		('fanta-1l', 'soda-flavor-1l', 'Fanta Orange', 0.00),
		('sprite-1l', 'soda-flavor-1l', 'Sprite', 0.00),
		('coke-500ml', 'soda-flavor-500ml', 'Coke', 0.00),
		('fanta-500ml', 'soda-flavor-500ml', 'Fanta Orange', 0.00),
		('sprite-500ml', 'soda-flavor-500ml', 'Sprite', 0.00),
		('coke-350ml', 'soda-flavor-350ml', 'Coke', 0.00),
		('fanta-350ml', 'soda-flavor-350ml', 'Fanta Orange', 0.00),
		('sprite-350ml', 'soda-flavor-350ml', 'Sprite', 0.00),
		('whole-milk', 'milk-choice', 'Fresh Whole Milk', 0.00),
		('oat-milk', 'milk-choice', 'Oat Milk', 50.00),
		('almond-milk', 'milk-choice', 'Almond Milk', 60.00)
		ON CONFLICT (id) DO NOTHING;
	`
	if _, err := pool.Exec(ctx, optionGroupQueries); err != nil {
		log.Printf("[Seeder Warning] Options seed: %v", err)
	}

	// 5. Seed Activities
	activityQueries := `
		INSERT INTO activities (id, title, subtitle, schedule, price, location, whatsapp_number, image, is_active, created_at, updated_at)
		VALUES
		('act-painting', 'Sunday Family Oil Painting', 'Guided sketches, child-safe oil paints, and creative fun in our cafe garden.', '12:00 PM – 2:00 PM', 0.00, 'Cafe Garden, Kisumu', '254704769219', 'painting-1.jpg', true, NOW(), NOW())
		ON CONFLICT (id) DO NOTHING;
	`
	if _, err := pool.Exec(ctx, activityQueries); err != nil {
		log.Printf("[Seeder Warning] Activity seed: %v", err)
	}

	// 6. Seed a sample order LPC-8924 for demo live tracking
	orderQuery := `
		INSERT INTO orders (
			id, user_id, status, subtotal, delivery_fee, vat, total,
			payment_method, payment_status, address_name, landmark, estate_building,
			delivery_instructions, phone, save_address, courier_name, courier_phone,
			courier_lat, courier_lng, estimated_delivery_minutes, created_at, updated_at
		) VALUES (
			'LPC-8924', 'usr-1', 'OUT_FOR_DELIVERY', 1350.00, 150.00, 206.90, 1500.00,
			'mpesa', 'PAID', 'East Kisumu Villa', 'Near Mega Plaza', 'Block B, Apt 4',
			'Leave at reception or call on arrival', '+254 712 345 678', true,
			'Kisumu Express Delivery Team', '+254 704 769 219',
			-0.0917, 34.7680, 25, NOW() - INTERVAL '20 minutes', NOW()
		) ON CONFLICT (id) DO NOTHING;

		INSERT INTO order_items (id, order_id, product_id, product_name, option_id, option_name, quantity, unit_price, option_price, total_price)
		VALUES
		('item-1', 'LPC-8924', 'big-boss-burger', 'Big Boss Burger', 'smoky-bbq', 'Smoky BBQ Sauce', 1, 850.00, 0.00, 850.00),
		('item-2', 'LPC-8924', 'cold-brew-vanilla', 'Cold Brew Vanilla Sweet Cream', 'whole-milk', 'Fresh Whole Milk', 1, 450.00, 0.00, 450.00)
		ON CONFLICT (id) DO NOTHING;

		INSERT INTO order_tracking_steps (id, order_id, status, label, step_index, completed, timestamp)
		VALUES
		('step-1', 'LPC-8924', 'PENDING', 'Order Placed', 1, true, NOW() - INTERVAL '20 minutes'),
		('step-2', 'LPC-8924', 'CONFIRMED', 'Confirmed by Cafe', 2, true, NOW() - INTERVAL '18 minutes'),
		('step-3', 'LPC-8924', 'PREPARING', 'Kitchen Preparing', 3, true, NOW() - INTERVAL '15 minutes'),
		('step-4', 'LPC-8924', 'OUT_FOR_DELIVERY', 'Courier Dispatched', 4, true, NOW() - INTERVAL '5 minutes')
		ON CONFLICT (id) DO NOTHING;
	`
	if _, err := pool.Exec(ctx, orderQuery); err != nil {
		log.Printf("[Seeder Warning] Sample order seed: %v", err)
	}

	// 7. Seed Activity Badges
	badgeQuery := `
		INSERT INTO activity_badges (id, title, desc_text, icon, is_new, created_at, updated_at)
		VALUES
		('badge-1', 'Sundays · 12:00 PM – 2:00 PM', '2-hour guided painting workshop for kids and parents.', 'clock', false, NOW(), NOW()),
		('badge-2', 'Sketches & Oil Paints', 'Sketch sheets, child-safe paints, and take-home canvas provided.', 'brush', false, NOW(), NOW()),
		('badge-3', 'Garden Terrace + Treat', 'Includes reserved lakeside outdoor seating + complimentary iced brew for parent.', 'heart', false, NOW(), NOW()),
		('badge-4', 'Take Canvas Home', 'Take home your dried canvas masterpiece at the end of the session.', 'sparkles', true, NOW(), NOW())
		ON CONFLICT (id) DO NOTHING;
	`
	if _, err := pool.Exec(ctx, badgeQuery); err != nil {
		log.Printf("[Seeder Warning] Activity badges seed: %v", err)
	}

	// 8. Seed Gallery Photos
	galleryQuery := `
		INSERT INTO gallery_photos (id, source, label, created_at)
		VALUES
		('gal-1', 'painting-1.jpg', 'Coloring the Sketch', NOW()),
		('gal-2', 'painting-2.jpg', 'Young Artist in Action', NOW()),
		('gal-3', 'painting-3.jpg', 'Sunday Garden Session', NOW()),
		('gal-4', 'painting-4.jpg', 'Oil Paints & Palette', NOW()),
		('gal-5', 'painting-5.jpg', 'Canvas Work in Progress', NOW()),
		('gal-6', 'painting-6.jpg', 'Family Joy & Creativity', NOW()),
		('gal-7', 'painting-7.jpg', 'Detailed Brushwork', NOW()),
		('gal-8', 'painting-8.jpg', 'Masterpiece Complete', NOW())
		ON CONFLICT (id) DO NOTHING;
	`
	if _, err := pool.Exec(ctx, galleryQuery); err != nil {
		log.Printf("[Seeder Warning] Gallery photos seed: %v", err)
	}

	log.Println("[Seeder] Little Polo Cafe data seeding completed successfully.")
	return nil
}
