package http

import (
	"context"
	"errors"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/littlepolocafe/backend/internal/domain"
)

type ActivityReader interface {
	GetAllActivities(ctx context.Context) ([]domain.Activity, error)
	GetActivityByID(ctx context.Context, id string) (*domain.Activity, error)
}

type ActivityHandler struct {
	activityRepo ActivityReader
}

func NewActivityHandler(activityRepo ActivityReader) *ActivityHandler {
	return &ActivityHandler{activityRepo: activityRepo}
}

// GetActivities returns all active cafe events and activities.
func (h *ActivityHandler) GetActivities(c *gin.Context) {
	activities, err := h.activityRepo.GetAllActivities(c.Request.Context())
	if err != nil {
		JSONError(c, http.StatusInternalServerError, "Failed to load activities: "+err.Error())
		return
	}

	if activities == nil {
		activities = []domain.Activity{}
	}

	JSONSuccess(c, http.StatusOK, activities)
}

// GetActivity returns a single activity by ID.
func (h *ActivityHandler) GetActivity(c *gin.Context) {
	id := c.Param("id")
	activity, err := h.activityRepo.GetActivityByID(c.Request.Context(), id)
	if err != nil {
		if errors.Is(err, domain.ErrActivityNotFound) {
			JSONError(c, http.StatusNotFound, "Activity not found")
			return
		}
		JSONError(c, http.StatusInternalServerError, "Failed to load activity: "+err.Error())
		return
	}

	JSONSuccess(c, http.StatusOK, activity)
}
