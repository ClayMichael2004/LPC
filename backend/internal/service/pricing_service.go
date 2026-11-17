package service

import (
	"context"
	"errors"
	"fmt"
	"math"
	"strings"

	"github.com/littlepolocafe/backend/internal/domain"
)

const (
	StandardDeliveryFeeKES = 150.00
	VATRate                = 0.16 // Kenya 16% VAT
)

var (
	ErrEmptyCart            = errors.New("cart cannot be empty")
	ErrInvalidQuantity      = errors.New("item quantity must be at least 1")
	ErrInvalidProductOption = errors.New("invalid product option selected")
)

type ProductReader interface {
	GetProductByID(ctx context.Context, id string) (*domain.Product, error)
}

type PricingService struct {
	productRepo ProductReader
}

func NewPricingService(productRepo ProductReader) *PricingService {
	return &PricingService{productRepo: productRepo}
}

// CalculatePrice performs strict server-side price calculation.
// Client prices or totals are NEVER trusted.
func (s *PricingService) CalculatePrice(ctx context.Context, items []domain.OrderItemInput, deliveryType string) (*domain.PriceSummary, error) {
	if len(items) == 0 {
		return nil, ErrEmptyCart
	}

	var calculatedItems []domain.OrderItem
	var subtotal float64

	for _, input := range items {
		if input.Quantity <= 0 {
			return nil, ErrInvalidQuantity
		}

		product, err := s.productRepo.GetProductByID(ctx, input.ProductID)
		if err != nil {
			return nil, fmt.Errorf("error resolving product %s: %w", input.ProductID, err)
		}

		unitPrice := product.Price
		var optionPrice float64
		var optionName *string
		var selectedOptionID *string

		if input.OptionID != nil && *input.OptionID != "" {
			if !product.HasOptions || product.OptionsGroup == nil {
				return nil, fmt.Errorf("product %s does not accept options", product.Name)
			}

			// Verify selected option belongs to product's option group
			var matchedOption *domain.ProductOption
			for _, opt := range product.OptionsGroup.Options {
				if opt.ID == *input.OptionID || strings.HasPrefix(opt.ID, *input.OptionID+"-") {
					optCopy := opt
					matchedOption = &optCopy
					break
				}
			}

			if matchedOption == nil {
				return nil, fmt.Errorf("option %s is not valid for product %s", *input.OptionID, product.Name)
			}

			optionPrice = matchedOption.ExtraPrice
			optionName = &matchedOption.Name
			selectedOptionID = &matchedOption.ID
		} else if product.HasOptions && product.OptionsGroup != nil && product.OptionsGroup.Required {
			return nil, fmt.Errorf("option selection is required for product %s (%s)", product.Name, product.OptionsGroup.Title)
		}

		itemUnitTotal := unitPrice + optionPrice
		itemTotalPrice := itemUnitTotal * float64(input.Quantity)
		subtotal += itemTotalPrice

		calculatedItems = append(calculatedItems, domain.OrderItem{
			ProductID:   product.ID,
			ProductName: product.Name,
			OptionID:    selectedOptionID,
			OptionName:  optionName,
			Quantity:    input.Quantity,
			UnitPrice:   unitPrice,
			OptionPrice: optionPrice,
			TotalPrice:  round2(itemTotalPrice),
		})
	}

	deliveryFee := StandardDeliveryFeeKES
	if deliveryType == "pickup" {
		deliveryFee = 0.00
	}

	// 16% VAT breakdown
	vat := round2(subtotal * VATRate)
	total := round2(subtotal + deliveryFee)

	return &domain.PriceSummary{
		Subtotal:    round2(subtotal),
		DeliveryFee: deliveryFee,
		VAT:         vat,
		Total:       total,
		Items:       calculatedItems,
	}, nil
}

func round2(val float64) float64 {
	return math.Round(val*100) / 100
}
