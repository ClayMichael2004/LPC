package domain

import "errors"

var ErrActivityNotFound = errors.New("activity not found")

// Activity represents cafe events, such as the Sunday Family Oil Painting workshop.
type Activity struct {
	ID             string   `json:"id"`
	Title          string   `json:"title"`
	Subtitle       string   `json:"subtitle"`
	Schedule       string   `json:"schedule"`
	Price          float64  `json:"price"`
	Location       string   `json:"location"`
	WhatsAppNumber string   `json:"whatsAppNumber"`
	Image          string   `json:"image"`
	Gallery        []string `json:"gallery"`
	IsActive       bool     `json:"isActive"`
	CreatedAt      EATTime  `json:"createdAt"`
	UpdatedAt      EATTime  `json:"updatedAt"`
}
