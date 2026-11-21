package websocket

import (
	"context"
	"encoding/json"
	"log"
	"sync"
	"time"

	"github.com/gorilla/websocket"
	"github.com/littlepolocafe/backend/internal/domain"
	redisclient "github.com/redis/go-redis/v9"
)

const (
	writeWait      = 10 * time.Second
	pongWait       = 60 * time.Second
	pingPeriod     = (pongWait * 9) / 10
	maxMessageSize = 512
)

type WSMessage struct {
	Type      string         `json:"type"` // "ORDER_UPDATE", "COURIER_LOCATION", "NEW_ORDER", "HEARTBEAT"
	OrderID   string         `json:"orderId"`
	Payload   interface{}    `json:"payload"`
	Timestamp domain.EATTime `json:"timestamp"`
}

type Client struct {
	hub     *Hub
	conn    *websocket.Conn
	send    chan []byte
	orderID string // empty if admin
	isAdmin bool
}

type Hub struct {
	mu           sync.RWMutex
	clients      map[*Client]bool
	orderRooms   map[string]map[*Client]bool
	adminClients map[*Client]bool
	register     chan *Client
	unregister   chan *Client
	redisClient  *redisclient.Client
}

func NewHub(redisClient *redisclient.Client) *Hub {
	return &Hub{
		clients:      make(map[*Client]bool),
		orderRooms:   make(map[string]map[*Client]bool),
		adminClients: make(map[*Client]bool),
		register:     make(chan *Client, 128),
		unregister:   make(chan *Client, 128),
		redisClient:  redisClient,
	}
}

func (h *Hub) Run(ctx context.Context) {
	// If Redis is connected, start Redis PubSub subscriber
	if h.redisClient != nil {
		go h.subscribeRedisPubSub(ctx)
	}

	for {
		select {
		case <-ctx.Done():
			return

		case client := <-h.register:
			h.mu.Lock()
			h.clients[client] = true
			if client.isAdmin {
				h.adminClients[client] = true
				log.Println("[WebSocket Hub] Admin client connected.")
			} else if client.orderID != "" {
				if _, ok := h.orderRooms[client.orderID]; !ok {
					h.orderRooms[client.orderID] = make(map[*Client]bool)
				}
				h.orderRooms[client.orderID][client] = true
				log.Printf("[WebSocket Hub] Client subscribed to Order #%s", client.orderID)
			}
			h.mu.Unlock()

		case client := <-h.unregister:
			h.mu.Lock()
			if _, ok := h.clients[client]; ok {
				delete(h.clients, client)
				close(client.send)
				if client.isAdmin {
					delete(h.adminClients, client)
				}
				if client.orderID != "" {
					if room, ok := h.orderRooms[client.orderID]; ok {
						delete(room, client)
						if len(room) == 0 {
							delete(h.orderRooms, client.orderID)
						}
					}
				}
			}
			h.mu.Unlock()
		}
	}
}

// BroadcastOrderUpdate sends an order tracking update to subscribers and admins.
func (h *Hub) BroadcastOrderUpdate(orderID string, tracking *domain.OrderTracking) {
	msg := WSMessage{
		Type:      "ORDER_UPDATE",
		OrderID:   orderID,
		Payload:   tracking,
		Timestamp: domain.NowEAT(),
	}

	data, err := json.Marshal(msg)
	if err != nil {
		log.Printf("[WebSocket Hub Error] Failed to marshal update: %v", err)
		return
	}

	// Publish to Redis for multi-instance fan-out; fallback to direct local dispatch if Redis is nil or errors
	if h.redisClient != nil {
		if err := h.redisClient.Publish(context.Background(), "lpc:events:orders", data).Err(); err == nil {
			return
		}
	}

	h.dispatchLocally(orderID, data)
}

// BroadcastCourierLocation sends live GPS location update to order room.
func (h *Hub) BroadcastCourierLocation(orderID string, coords domain.Coordinates) {
	msg := WSMessage{
		Type:      "COURIER_LOCATION",
		OrderID:   orderID,
		Payload:   coords,
		Timestamp: domain.NowEAT(),
	}

	data, err := json.Marshal(msg)
	if err != nil {
		return
	}

	if h.redisClient != nil {
		if err := h.redisClient.Publish(context.Background(), "lpc:events:orders", data).Err(); err == nil {
			return
		}
	}

	h.dispatchLocally(orderID, data)
}

func (h *Hub) dispatchLocally(orderID string, data []byte) {
	h.mu.RLock()
	var deadClients []*Client

	// 1. Send to customers watching this specific order
	if room, ok := h.orderRooms[orderID]; ok {
		for client := range room {
			select {
			case client.send <- data:
			default:
				deadClients = append(deadClients, client)
			}
		}
	}

	// 2. Send to all cafe owners / admin clients
	for admin := range h.adminClients {
		select {
		case admin.send <- data:
		default:
			deadClients = append(deadClients, admin)
		}
	}
	h.mu.RUnlock()

	// Safely unregister dead clients without data race
	for _, dead := range deadClients {
		select {
		case h.unregister <- dead:
		default:
		}
	}
}

func (h *Hub) subscribeRedisPubSub(ctx context.Context) {
	pubsub := h.redisClient.Subscribe(ctx, "lpc:events:orders")
	defer pubsub.Close()

	ch := pubsub.Channel()
	for msg := range ch {
		var wsMsg WSMessage
		if err := json.Unmarshal([]byte(msg.Payload), &wsMsg); err == nil {
			h.dispatchLocally(wsMsg.OrderID, []byte(msg.Payload))
		}
	}
}
