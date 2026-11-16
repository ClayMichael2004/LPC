package domain

// Category represents a menu section (e.g. burgers, artisan-coffee, drinks).
type Category struct {
	ID           string  `json:"id"`
	Name         string  `json:"name"`
	Image        string  `json:"image"`
	DisplayOrder int     `json:"displayOrder"`
	CreatedAt    EATTime `json:"createdAt"`
	UpdatedAt    EATTime `json:"updatedAt"`
}

// ProductOption represents an add-on or customization option (e.g., choice of sauce, milk preference).
type ProductOption struct {
	ID            string  `json:"id"`
	OptionGroupID string  `json:"optionGroupId,omitempty"`
	Name          string  `json:"name"`
	ExtraPrice    float64 `json:"extraPrice"`
}

// ProductOptionGroup defines a group of options for a product.
type ProductOptionGroup struct {
	ID       string          `json:"id"`
	Title    string          `json:"title"`
	Required bool            `json:"required"`
	Min      int             `json:"min"`
	Max      int             `json:"max"`
	Options  []ProductOption `json:"options"`
}

// Product represents a cafe menu item with server-side price and out-of-stock guard.
type Product struct {
	ID            string              `json:"id"`
	Name          string              `json:"name"`
	Category      string              `json:"category"`
	Price         float64             `json:"price"`
	Description   string              `json:"description"`
	Image         string              `json:"image"`
	HasOptions    bool                `json:"hasOptions"`
	OptionsGroup  *ProductOptionGroup `json:"optionsGroup,omitempty"`
	IsAvailable   bool                `json:"isAvailable"`
	StockQuantity int                 `json:"stockQuantity"` // -1 for unlimited, or positive integer
	CreatedAt     EATTime             `json:"createdAt"`
	UpdatedAt     EATTime             `json:"updatedAt"`
}

// FullMenu represents the unified payload containing categories and categorized products.
type FullMenu struct {
	Categories []Category `json:"categories"`
	Products   []Product  `json:"products"`
}

// UpdateStockRequest is sent by Admin to update stock and availability.
type UpdateStockRequest struct {
	IsAvailable   *bool `json:"isAvailable,omitempty"`
	StockQuantity *int  `json:"stockQuantity,omitempty"`
}

// PromoBanner represents promotional carousels shown on the mobile home screen.
type PromoBanner struct {
	ID       string `json:"id"`
	Title    string `json:"title"`
	Subtitle string `json:"subtitle"`
	Image    string `json:"image"`
}
