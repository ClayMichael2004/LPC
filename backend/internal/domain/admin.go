package domain

// LoginResponse represents the result of /auth/login.
// If the account is an administrator, RequiresOTP will be true and the user must verify OTP before receiving a JWT.
type LoginResponse struct {
	RequiresOTP bool   `json:"requiresOtp,omitempty"`
	Role        string `json:"role,omitempty"`
	Email       string `json:"email,omitempty"`
	Phone       string `json:"phone,omitempty"`
	Message     string `json:"message,omitempty"`
	Token       string `json:"token,omitempty"`
	TokenType   string `json:"tokenType,omitempty"`
	ExpiresIn   int64  `json:"expiresIn,omitempty"`
	User        *User  `json:"user,omitempty"`
}

// BroadcastRecipient represents a single recipient who received a broadcast message.
type BroadcastRecipient struct {
	UserID string `json:"userId"`
	Name   string `json:"name"`
	Target string `json:"target"` // Email address or WhatsApp phone number
	Status string `json:"status"` // e.g. "DELIVERED"
}

// BroadcastLog tracks bulk announcements dispatched by the cafe owner.
type BroadcastLog struct {
	ID         string               `json:"id"`
	Channel    string               `json:"channel"` // "email" or "whatsapp"
	Subject    string               `json:"subject"`
	Message    string               `json:"message"`
	SentAt     EATTime              `json:"sentAt"`
	TotalSent  int                  `json:"totalSent"`
	Recipients []BroadcastRecipient `json:"recipients"`
}

// SendBroadcastRequest payload to dispatch a bulk communication.
type SendBroadcastRequest struct {
	Channel string `json:"channel" binding:"required,oneof=email whatsapp in-app"`
	Subject string `json:"subject" binding:"required"`
	Message string `json:"message" binding:"required"`
}

// AdminNotification represents administrative and operational alerts for the cafe owner.
type AdminNotification struct {
	ID        string  `json:"id"`
	Type      string  `json:"type"` // "broadcast", "registration", "order", "system"
	Title     string  `json:"title"`
	Message   string  `json:"message"`
	Timestamp EATTime `json:"timestamp"`
	Read      bool    `json:"read"`
}

// SpecialPromo represents dynamic promotional banners and feature cards on the home screen.
type SpecialPromo struct {
	ID          string  `json:"id"`
	Title       string  `json:"title"`
	Description string  `json:"description"`
	Category    string  `json:"category"`
	IconName    string  `json:"iconName"`
	Badge       string  `json:"badge"`
	TintColor   string  `json:"tintColor"`
	IconColor   string  `json:"iconColor"`
	IsActive    bool    `json:"isActive"`
	CreatedAt   EATTime `json:"createdAt"`
}

// GalleryPhoto represents a curated photo in the activities event gallery.
type GalleryPhoto struct {
	ID        string  `json:"id"`
	Source    string  `json:"source"`
	Label     string  `json:"label"`
	CreatedAt EATTime `json:"createdAt"`
}

// ActivityBadge represents an event highlight card shown on the customer activities screen.
type ActivityBadge struct {
	ID        string  `json:"id"`
	Title     string  `json:"title"`
	Desc      string  `json:"desc"`
	Icon      string  `json:"icon"` // "clock", "brush", "heart", "sparkles", "mapPin"
	IsNew     bool    `json:"isNew"`
	CreatedAt EATTime `json:"createdAt"`
	UpdatedAt EATTime `json:"updatedAt"`
}

// CustomerNotification represents real-time communications, broadcast updates, and event alerts for app users.
type CustomerNotification struct {
	ID        string  `json:"id"`
	Category  string  `json:"category"` // "activities" or "offers"
	Title     string  `json:"title"`
	Message   string  `json:"message"`
	Channel   string  `json:"channel"` // "email" or "whatsapp"
	Timestamp EATTime `json:"timestamp"`
	Read      bool    `json:"read"`
}
