package http

import (
	"errors"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/littlepolocafe/backend/internal/repository/postgres"
	"github.com/littlepolocafe/backend/internal/service"
)

type MenuHandler struct {
	menuService *service.MenuService
}

func NewMenuHandler(menuService *service.MenuService) *MenuHandler {
	return &MenuHandler{menuService: menuService}
}

// GetFullMenu returns all menu categories and products.
// Results are cached in Redis for fast retrieval (<5ms).
func (h *MenuHandler) GetFullMenu(c *gin.Context) {
	menu, err := h.menuService.GetFullMenu(c.Request.Context())
	if err != nil {
		JSONError(c, http.StatusInternalServerError, "Failed to load menu: "+err.Error())
		return
	}

	JSONSuccess(c, http.StatusOK, menu)
}

// GetPromoBanners returns the promotional carousel items.
func (h *MenuHandler) GetPromoBanners(c *gin.Context) {
	banners := h.menuService.GetPromoBanners()
	JSONSuccess(c, http.StatusOK, banners)
}

// GetProduct returns a single product by ID.
func (h *MenuHandler) GetProduct(c *gin.Context) {
	id := c.Param("id")
	if id == "" {
		JSONError(c, http.StatusBadRequest, "Product ID is required")
		return
	}

	product, err := h.menuService.GetProductByID(c.Request.Context(), id)
	if err != nil {
		if errors.Is(err, postgres.ErrProductNotFound) {
			JSONError(c, http.StatusNotFound, "Product not found")
			return
		}
		JSONError(c, http.StatusInternalServerError, "Failed to fetch product: "+err.Error())
		return
	}

	JSONSuccess(c, http.StatusOK, product)
}
