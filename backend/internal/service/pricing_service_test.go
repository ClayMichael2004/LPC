package service_test

import (
	"context"
	"fmt"
	"testing"

	"github.com/littlepolocafe/backend/internal/domain"
	"github.com/littlepolocafe/backend/internal/service"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

type mockProductReader struct {
	products map[string]*domain.Product
}

func (m *mockProductReader) GetProductByID(ctx context.Context, id string) (*domain.Product, error) {
	if p, ok := m.products[id]; ok {
		return p, nil
	}
	return nil, fmt.Errorf("product not found: %s", id)
}

func TestPricingService_ServerSidePriceCalculation(t *testing.T) {
	mockRepo := &mockProductReader{
		products: map[string]*domain.Product{
			"big-boss-burger": {
				ID:         "big-boss-burger",
				Name:       "Big Boss Burger",
				Price:      850.00,
				HasOptions: true,
				OptionsGroup: &domain.ProductOptionGroup{
					ID:       "burger-sauce",
					Title:    "Choose Your Sauce",
					Required: true,
					Min:      1,
					Max:      1,
					Options: []domain.ProductOption{
						{ID: "smoky-bbq", Name: "Smoky BBQ Sauce", ExtraPrice: 0.00},
						{ID: "spicy-mayo", Name: "Spicy Chili Mayo", ExtraPrice: 20.00},
					},
				},
			},
			"cold-brew-vanilla": {
				ID:         "cold-brew-vanilla",
				Name:       "Cold Brew Vanilla Sweet Cream",
				Price:      450.00,
				HasOptions: true,
				OptionsGroup: &domain.ProductOptionGroup{
					ID:       "milk-choice",
					Title:    "Choose Your Milk",
					Required: true,
					Min:      1,
					Max:      1,
					Options: []domain.ProductOption{
						{ID: "whole-milk", Name: "Fresh Whole Milk", ExtraPrice: 0.00},
						{ID: "oat-milk", Name: "Oat Milk", ExtraPrice: 50.00},
					},
				},
			},
			"flaky-croissant": {
				ID:         "flaky-croissant",
				Name:       "Flaky Croissant",
				Price:      280.00,
				HasOptions: false,
			},
		},
	}

	pricingService := service.NewPricingService(mockRepo)
	ctx := context.Background()

	// Scenario 1: Delivery Order with Options
	// - 1 x big-boss-burger with spicy-mayo (+20.00) = 870.00
	// - 2 x cold-brew-vanilla with oat-milk (+50.00) = (450 + 50) * 2 = 1000.00
	// Subtotal = 1870.00
	// Delivery Fee = 150.00
	// VAT = round(1870 * 0.16) = 299.20
	// Total = 1870 + 150 = 2020.00
	sauceOpt := "spicy-mayo"
	milkOpt := "oat-milk"
	items := []domain.OrderItemInput{
		{ProductID: "big-boss-burger", OptionID: &sauceOpt, Quantity: 1},
		{ProductID: "cold-brew-vanilla", OptionID: &milkOpt, Quantity: 2},
	}

	summary, err := pricingService.CalculatePrice(ctx, items, "delivery")
	require.NoError(t, err)
	require.NotNil(t, summary)

	assert.Equal(t, 1870.00, summary.Subtotal)
	assert.Equal(t, 150.00, summary.DeliveryFee)
	assert.Equal(t, 299.20, summary.VAT)
	assert.Equal(t, 2020.00, summary.Total)
	assert.Len(t, summary.Items, 2)
	assert.Equal(t, 870.00, summary.Items[0].TotalPrice)
	assert.Equal(t, 1000.00, summary.Items[1].TotalPrice)

	// Scenario 2: Pickup Order (Waives 150 KES delivery fee)
	pickupSummary, err := pricingService.CalculatePrice(ctx, []domain.OrderItemInput{
		{ProductID: "flaky-croissant", Quantity: 2},
	}, "pickup")
	require.NoError(t, err)
	assert.Equal(t, 560.00, pickupSummary.Subtotal)
	assert.Equal(t, 0.00, pickupSummary.DeliveryFee)
	assert.Equal(t, 560.00, pickupSummary.Total)
	assert.Equal(t, 89.60, pickupSummary.VAT)

	// Scenario 3: Missing Required Option
	_, err = pricingService.CalculatePrice(ctx, []domain.OrderItemInput{
		{ProductID: "big-boss-burger", Quantity: 1}, // No sauce selected
	}, "delivery")
	assert.Error(t, err, "Should fail when required option is omitted")

	// Scenario 4: Non-existent Option ID
	fakeOpt := "invalid-opt"
	_, err = pricingService.CalculatePrice(ctx, []domain.OrderItemInput{
		{ProductID: "big-boss-burger", OptionID: &fakeOpt, Quantity: 1},
	}, "delivery")
	assert.Error(t, err, "Should fail when invalid option is provided")
}

func TestPricingService_ValidationErrors(t *testing.T) {
	pricingService := service.NewPricingService(&mockProductReader{})
	ctx := context.Background()

	// Empty cart
	_, err := pricingService.CalculatePrice(ctx, []domain.OrderItemInput{}, "delivery")
	assert.ErrorIs(t, err, service.ErrEmptyCart)

	// Zero quantity
	_, err = pricingService.CalculatePrice(ctx, []domain.OrderItemInput{{ProductID: "test", Quantity: 0}}, "delivery")
	assert.ErrorIs(t, err, service.ErrInvalidQuantity)

	// Negative quantity
	_, err = pricingService.CalculatePrice(ctx, []domain.OrderItemInput{{ProductID: "test", Quantity: -2}}, "delivery")
	assert.ErrorIs(t, err, service.ErrInvalidQuantity)
}
