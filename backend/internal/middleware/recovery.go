package middleware

import (
	"log"
	"net/http"

	"github.com/gin-gonic/gin"
)

// Recovery handles uncaught panics and returns a clean standardized camelCase error JSON.
func Recovery() gin.HandlerFunc {
	return func(c *gin.Context) {
		defer func() {
			if r := recover(); r != nil {
				log.Printf("[Panic Recovered] %v", r)
				c.AbortWithStatusJSON(http.StatusInternalServerError, gin.H{
					"error": "An internal server error occurred. Please try again.",
				})
			}
		}()
		c.Next()
	}
}
