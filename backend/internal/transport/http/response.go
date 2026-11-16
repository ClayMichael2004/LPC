package http

import "github.com/gin-gonic/gin"

// Response is the standardized camelCase envelope for JSON responses.
type Response struct {
	Success bool        `json:"success"`
	Data    interface{} `json:"data,omitempty"`
	Message string      `json:"message,omitempty"`
	Error   string      `json:"error,omitempty"`
}

func JSONSuccess(c *gin.Context, statusCode int, data interface{}) {
	c.JSON(statusCode, Response{
		Success: true,
		Data:    data,
	})
}

func JSONMessage(c *gin.Context, statusCode int, message string) {
	c.JSON(statusCode, Response{
		Success: true,
		Message: message,
	})
}

func JSONError(c *gin.Context, statusCode int, errMsg string) {
	c.JSON(statusCode, Response{
		Success: false,
		Error:   errMsg,
	})
}
