package service

import (
	"context"
	"errors"
	"fmt"
	"log"
	"strings"
	"sync"

	"github.com/google/uuid"
	"github.com/littlepolocafe/backend/internal/domain"
)

var (
	ErrSpecialNotFound = errors.New("special promo not found")
	ErrPhotoNotFound   = errors.New("gallery photo not found")
)

type ActivityStore interface {
	GetAllActivities(ctx context.Context) ([]domain.Activity, error)
	GetActivityByID(ctx context.Context, id string) (*domain.Activity, error)
}

type ActivityManager interface {
	ActivityStore
	CreateActivity(ctx context.Context, a *domain.Activity) error
	UpdateActivity(ctx context.Context, a *domain.Activity) error
	DeleteActivity(ctx context.Context, id string) error
}

type AdminService struct {
	userRepo       UserStore
	emailService   *EmailService
	menuService    *MenuService
	activityRepo   ActivityStore

	mu               sync.RWMutex
	broadcastLogs    []domain.BroadcastLog
	adminNotifs      []domain.AdminNotification
	customerNotifs   []domain.CustomerNotification
	userPrefs        map[string]domain.UserPreferences
	specials         map[string]*domain.SpecialPromo
	gallery          map[string]*domain.GalleryPhoto
	badges           map[string]*domain.ActivityBadge
	customActivities map[string]*domain.Activity
}

func NewAdminService(
	userRepo UserStore,
	emailService *EmailService,
	menuService *MenuService,
	activityRepo ActivityStore,
) *AdminService {
	s := &AdminService{
		userRepo:         userRepo,
		emailService:     emailService,
		menuService:      menuService,
		activityRepo:     activityRepo,
		broadcastLogs:    make([]domain.BroadcastLog, 0),
		adminNotifs:      make([]domain.AdminNotification, 0),
		customerNotifs:   make([]domain.CustomerNotification, 0),
		userPrefs:        make(map[string]domain.UserPreferences),
		specials:         make(map[string]*domain.SpecialPromo),
		gallery:          make(map[string]*domain.GalleryPhoto),
		badges:           make(map[string]*domain.ActivityBadge),
		customActivities: make(map[string]*domain.Activity),
	}

	// Seed initial specials matching Otto design system
	now := domain.NowEAT()
	initialSpecials := []*domain.SpecialPromo{
		{
			ID:          "special-1",
			Title:       "18-Hour Cold Brews",
			Description: "Steeped with single-origin Kenyan beans and finished with vanilla sweet cream.",
			Category:    "artisan-coffee",
			IconName:    "coffee",
			Badge:       "Cold Brew",
			TintColor:   "#DBEAFE",
			IconColor:   "#07345F",
			IsActive:    true,
			CreatedAt:   now,
		},
		{
			ID:          "special-2",
			Title:       "Brioche Burgers & Bakes",
			Description: "Artisanal house relish, melted cheddar, and crisp fresh patties.",
			Category:    "burgers",
			IconName:    "flame",
			Badge:       "Special Grill",
			TintColor:   "#DCFCE7",
			IconColor:   "#075B35",
			IsActive:    true,
			CreatedAt:   now,
		},
		{
			ID:          "special-3",
			Title:       "Kisumu Lakeview Brunch",
			Description: "Fluffy buttermilk pancakes, wildflower honey, and fresh fruit bowls.",
			Category:    "breakfast",
			IconName:    "sparkles",
			Badge:       "Brunch",
			TintColor:   "#FCE7F3",
			IconColor:   "#691414",
			IsActive:    true,
			CreatedAt:   now,
		},
		{
			ID:          "special-4",
			Title:       "Sunday Family Oil Painting",
			Description: "Creative afternoon garden workshop with canvas, easel, paints and iced brew.",
			Category:    "activities",
			IconName:    "palette",
			Badge:       "Workshop",
			TintColor:   "#E5D9FF",
			IconColor:   "#4C1D95",
			IsActive:    true,
			CreatedAt:   now,
		},
	}
	for _, spec := range initialSpecials {
		s.specials[spec.ID] = spec
	}

	// Seed initial gallery photos
	initialPhotos := []*domain.GalleryPhoto{
		{ID: "gal-1", Source: "painting-1.jpg", Label: "Coloring the Sketch", CreatedAt: now},
		{ID: "gal-2", Source: "painting-2.jpg", Label: "Young Artist in Action", CreatedAt: now},
		{ID: "gal-3", Source: "painting-3.jpg", Label: "Sunday Garden Session", CreatedAt: now},
		{ID: "gal-4", Source: "painting-4.jpg", Label: "Oil Paints & Palette", CreatedAt: now},
		{ID: "gal-5", Source: "painting-5.jpg", Label: "Canvas Work in Progress", CreatedAt: now},
		{ID: "gal-6", Source: "painting-6.jpg", Label: "Family Joy & Creativity", CreatedAt: now},
		{ID: "gal-7", Source: "painting-7.jpg", Label: "Detailed Brushwork", CreatedAt: now},
		{ID: "gal-8", Source: "painting-8.jpg", Label: "Masterpiece Complete", CreatedAt: now},
	}
	for _, p := range initialPhotos {
		s.gallery[p.ID] = p
	}

	// Seed initial activity badges
	initialBadges := []*domain.ActivityBadge{
		{
			ID:        "badge-1",
			Title:     "Sundays · 12:00 PM – 2:00 PM",
			Desc:      "2-hour guided painting workshop for kids and parents.",
			Icon:      "clock",
			IsNew:     false,
			CreatedAt: now,
			UpdatedAt: now,
		},
		{
			ID:        "badge-2",
			Title:     "Sketches & Oil Paints",
			Desc:      "Sketch sheets, child-safe paints, and take-home canvas provided.",
			Icon:      "brush",
			IsNew:     false,
			CreatedAt: now,
			UpdatedAt: now,
		},
		{
			ID:        "badge-3",
			Title:     "Garden Terrace + Treat",
			Desc:      "Includes reserved lakeside outdoor seating + complimentary iced brew for parent.",
			Icon:      "heart",
			IsNew:     false,
			CreatedAt: now,
			UpdatedAt: now,
		},
		{
			ID:        "badge-4",
			Title:     "Child & Family Safe",
			Desc:      "Aprons, non-toxic materials, and step-by-step mentoring from Little Polo artists.",
			Icon:      "sparkles",
			IsNew:     true,
			CreatedAt: now,
			UpdatedAt: now,
		},
	}
	for _, b := range initialBadges {
		s.badges[b.ID] = b
	}

	// Seed initial customer notifications
	initialCustomerNotifs := []domain.CustomerNotification{
		{
			ID:        "cnotif-1",
			Category:  "activities",
			Title:     "Sunday Family Oil Painting",
			Message:   "Join us this Sunday 12:00 PM – 2:00 PM. Guided sketch sheets and paints provided for little ones!",
			Channel:   "in-app",
			Timestamp: now,
			Read:      false,
		},
		{
			ID:        "cnotif-2",
			Category:  "offers",
			Title:     "Free Delivery on Lakeview Cold Brew",
			Message:   "Enjoy complimentary express delivery to East Kisumu & LBDA HQ on all cold brew orders today.",
			Channel:   "in-app",
			Timestamp: now,
			Read:      false,
		},
		{
			ID:        "cnotif-3",
			Category:  "activities",
			Title:     "New Animal Sketches Available",
			Message:   "We have added fresh safari animal outlines for the Sunday painting workshop!",
			Channel:   "in-app",
			Timestamp: now,
			Read:      true,
		},
		{
			ID:        "cnotif-4",
			Category:  "offers",
			Title:     "Weekend Brunch Special",
			Message:   "Buttermilk pancake stacks with wildflower honey now available every Saturday and Sunday.",
			Channel:   "in-app",
			Timestamp: now,
			Read:      true,
		},
	}
	s.customerNotifs = append(s.customerNotifs, initialCustomerNotifs...)

	// Seed initial admin operational notification
	s.adminNotifs = append(s.adminNotifs, domain.AdminNotification{
		ID:        "notif-welcome",
		Type:      "system",
		Title:     "Admin Dashboard Active",
		Message:   "Welcome to the Little Polo Cafe Owner portal. Real-time controls and communications are active.",
		Timestamp: now,
		Read:      false,
	})

	return s
}

// ----------------------------------------------------------------------------
// Bulk Communications & User Preferences
// ----------------------------------------------------------------------------

func (s *AdminService) GetUserPreferences(ctx context.Context, userID string) domain.UserPreferences {
	s.mu.RLock()
	defer s.mu.RUnlock()
	if pref, ok := s.userPrefs[userID]; ok {
		return pref
	}
	// Default: all communication channels opted in
	return domain.UserPreferences{
		UserID:    userID,
		SMS:       true,
		WhatsApp:  true,
		Email:     true,
		Promo:     true,
		UpdatedAt: domain.NowEAT(),
	}
}

func (s *AdminService) UpdateUserPreferences(ctx context.Context, pref domain.UserPreferences) domain.UserPreferences {
	s.mu.Lock()
	defer s.mu.Unlock()
	pref.UpdatedAt = domain.NowEAT()
	s.userPrefs[pref.UserID] = pref
	return pref
}

func (s *AdminService) GetAudience(ctx context.Context, channel string) ([]*domain.User, error) {
	allUsers, err := s.userRepo.GetAll(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch users: %w", err)
	}

	var eligible []*domain.User
	for _, u := range allUsers {
		// Only target registered customers
		if u.Role == domain.RoleAdmin {
			continue
		}

		// Retrieve customer preferences
		pref := s.GetUserPreferences(ctx, u.ID)

		if channel == "email" {
			// Must have valid email AND customer has email preferences enabled
			if strings.Contains(u.Email, "@") && pref.Email {
				eligible = append(eligible, u)
			}
		} else if channel == "whatsapp" {
			// Must have phone AND customer has whatsapp preferences enabled
			if len(strings.TrimSpace(u.Phone)) >= 9 && pref.WhatsApp {
				eligible = append(eligible, u)
			}
		} else if channel == "in-app" {
			// In-app notices delivered to customers who opted in to promotional/in-app notices
			if pref.Promo {
				eligible = append(eligible, u)
			}
		}
	}
	return eligible, nil
}

func (s *AdminService) SendBroadcast(ctx context.Context, req domain.SendBroadcastRequest) (*domain.BroadcastLog, error) {
	channel := strings.ToLower(strings.TrimSpace(req.Channel))
	subject := strings.TrimSpace(req.Subject)
	message := strings.TrimSpace(req.Message)

	if subject == "" || message == "" {
		return nil, errors.New("subject and message body are required")
	}

	eligibleUsers, err := s.GetAudience(ctx, channel)
	if err != nil {
		return nil, err
	}

	var recipients []domain.BroadcastRecipient
	now := domain.NowEAT()

	for _, u := range eligibleUsers {
		target := u.Email
		if channel == "whatsapp" {
			target = u.Phone
		} else if channel == "in-app" {
			target = "In-App Notification Center"
		}

		recipients = append(recipients, domain.BroadcastRecipient{
			UserID: u.ID,
			Name:   u.Name,
			Target: target,
			Status: "DELIVERED",
		})

		// Asynchronously dispatch based on channel
		if channel == "email" && s.emailService != nil {
			targetEmail := u.Email
			userName := u.Name
			go func() {
				_ = s.emailService.SendBroadcastEmail(targetEmail, userName, subject, message)
			}()
		} else if channel == "whatsapp" {
			log.Printf("==================================================================")
			log.Printf("[WHATSAPP BROADCAST DISPATCH] To: %s (%s)", u.Phone, u.Name)
			log.Printf("[SUBJECT] %s", subject)
			log.Printf("[MESSAGE] %s", message)
			log.Printf("==================================================================")
		} else if channel == "in-app" {
			log.Printf("==================================================================")
			log.Printf("[IN-APP NOTIFICATION DISPATCH] User: %s (%s)", u.ID, u.Name)
			log.Printf("[SUBJECT] %s", subject)
			log.Printf("[MESSAGE] %s", message)
			log.Printf("==================================================================")
		}
	}

	logEntry := domain.BroadcastLog{
		ID:         "bcast-" + uuid.NewString()[:8],
		Channel:    channel,
		Subject:    subject,
		Message:    message,
		SentAt:     now,
		TotalSent:  len(recipients),
		Recipients: recipients,
	}

	s.mu.Lock()
	// Prepend newest log
	s.broadcastLogs = append([]domain.BroadcastLog{logEntry}, s.broadcastLogs...)

	// Record customer-facing notification so all customers see the announcement in their app notification center
	category := "offers"
	subjLower := strings.ToLower(subject)
	if strings.Contains(subjLower, "paint") || strings.Contains(subjLower, "workshop") || strings.Contains(subjLower, "activit") || strings.Contains(subjLower, "sketch") {
		category = "activities"
	}
	custNotif := domain.CustomerNotification{
		ID:        "cnotif-" + uuid.NewString()[:8],
		Category:  category,
		Title:     subject,
		Message:   message,
		Channel:   channel,
		Timestamp: now,
		Read:      false,
	}
	s.customerNotifs = append([]domain.CustomerNotification{custNotif}, s.customerNotifs...)

	// Create an administrative notification for the cafe owner
	notif := domain.AdminNotification{
		ID:        "notif-" + uuid.NewString()[:8],
		Type:      "broadcast",
		Title:     "Broadcast Sent",
		Message:   fmt.Sprintf("Sent '%s' to %d opted-in customers via %s", subject, len(recipients), strings.ToUpper(channel)),
		Timestamp: now,
		Read:      false,
	}
	s.adminNotifs = append([]domain.AdminNotification{notif}, s.adminNotifs...)
	s.mu.Unlock()

	return &logEntry, nil
}

func (s *AdminService) GetBroadcastLogs(ctx context.Context) []domain.BroadcastLog {
	s.mu.RLock()
	defer s.mu.RUnlock()
	res := make([]domain.BroadcastLog, len(s.broadcastLogs))
	copy(res, s.broadcastLogs)
	return res
}

// ----------------------------------------------------------------------------
// Admin Operational Notifications
// ----------------------------------------------------------------------------

func (s *AdminService) GetAdminNotifications(ctx context.Context) []domain.AdminNotification {
	s.mu.RLock()
	defer s.mu.RUnlock()
	res := make([]domain.AdminNotification, len(s.adminNotifs))
	copy(res, s.adminNotifs)
	return res
}

func (s *AdminService) AddOperationalNotification(notifType, title, message string) {
	s.mu.Lock()
	defer s.mu.Unlock()
	n := domain.AdminNotification{
		ID:        "notif-" + uuid.NewString()[:8],
		Type:      notifType,
		Title:     title,
		Message:   message,
		Timestamp: domain.NowEAT(),
		Read:      false,
	}
	s.adminNotifs = append([]domain.AdminNotification{n}, s.adminNotifs...)
}

func (s *AdminService) MarkNotificationRead(ctx context.Context, id string) {
	s.mu.Lock()
	defer s.mu.Unlock()
	for i := range s.adminNotifs {
		if s.adminNotifs[i].ID == id {
			s.adminNotifs[i].Read = true
			break
		}
	}
}

// ----------------------------------------------------------------------------
// Today's Specials Management
// ----------------------------------------------------------------------------

func (s *AdminService) GetSpecials(ctx context.Context) []domain.SpecialPromo {
	s.mu.RLock()
	defer s.mu.RUnlock()
	var list []domain.SpecialPromo
	for _, spec := range s.specials {
		if spec.IsActive {
			list = append(list, *spec)
		}
	}
	return list
}

func (s *AdminService) CreateSpecial(ctx context.Context, p *domain.SpecialPromo) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	if p.ID == "" {
		p.ID = "spec-" + uuid.NewString()[:8]
	}
	p.CreatedAt = domain.NowEAT()
	p.IsActive = true
	s.specials[p.ID] = p
	return nil
}

func (s *AdminService) DeleteSpecial(ctx context.Context, id string) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	if _, ok := s.specials[id]; !ok {
		return ErrSpecialNotFound
	}
	delete(s.specials, id)
	return nil
}

// ----------------------------------------------------------------------------
// Event Gallery Management
// ----------------------------------------------------------------------------

func (s *AdminService) GetGallery(ctx context.Context) []domain.GalleryPhoto {
	s.mu.RLock()
	defer s.mu.RUnlock()
	var list []domain.GalleryPhoto
	for _, p := range s.gallery {
		list = append(list, *p)
	}
	return list
}

func (s *AdminService) AddGalleryPhoto(ctx context.Context, p *domain.GalleryPhoto) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	if p.ID == "" {
		p.ID = "gal-" + uuid.NewString()[:8]
	}
	p.CreatedAt = domain.NowEAT()
	s.gallery[p.ID] = p
	return nil
}

func (s *AdminService) DeleteGalleryPhoto(ctx context.Context, id string) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	if _, ok := s.gallery[id]; !ok {
		return ErrPhotoNotFound
	}
	delete(s.gallery, id)
	return nil
}

// ----------------------------------------------------------------------------
// Activities Management
// ----------------------------------------------------------------------------

func (s *AdminService) GetAllActivities(ctx context.Context) ([]domain.Activity, error) {
	// First fetch base activities from activityRepo
	var result []domain.Activity
	if s.activityRepo != nil {
		base, _ := s.activityRepo.GetAllActivities(ctx)
		result = append(result, base...)
	}

	s.mu.RLock()
	defer s.mu.RUnlock()
	for _, act := range s.customActivities {
		if act.IsActive {
			result = append(result, *act)
		}
	}
	return result, nil
}

func (s *AdminService) CreateActivity(ctx context.Context, a *domain.Activity) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	if a.ID == "" {
		a.ID = "act-" + uuid.NewString()[:8]
	}
	now := domain.NowEAT()
	a.CreatedAt = now
	a.UpdatedAt = now
	a.IsActive = true
	s.customActivities[a.ID] = a
	return nil
}

func (s *AdminService) UpdateActivity(ctx context.Context, a *domain.Activity) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	a.UpdatedAt = domain.NowEAT()
	s.customActivities[a.ID] = a
	return nil
}

func (s *AdminService) DeleteActivity(ctx context.Context, id string) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	if _, ok := s.customActivities[id]; ok {
		delete(s.customActivities, id)
		return nil
	}
	return nil
}

// ----------------------------------------------------------------------------
// Activity Badges Management
// ----------------------------------------------------------------------------

func (s *AdminService) GetBadges(ctx context.Context) []domain.ActivityBadge {
	s.mu.RLock()
	defer s.mu.RUnlock()
	var list []domain.ActivityBadge
	for _, b := range s.badges {
		list = append(list, *b)
	}
	return list
}

func (s *AdminService) CreateBadge(ctx context.Context, b *domain.ActivityBadge) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	if b.ID == "" {
		b.ID = "badge-" + uuid.NewString()[:8]
	}
	now := domain.NowEAT()
	b.CreatedAt = now
	b.UpdatedAt = now
	s.badges[b.ID] = b
	return nil
}

func (s *AdminService) UpdateBadge(ctx context.Context, b *domain.ActivityBadge) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	b.UpdatedAt = domain.NowEAT()
	s.badges[b.ID] = b
	return nil
}

func (s *AdminService) DeleteBadge(ctx context.Context, id string) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	if _, ok := s.badges[id]; ok {
		delete(s.badges, id)
		return nil
	}
	return nil
}

// ----------------------------------------------------------------------------
// Customer In-App Notifications
// ----------------------------------------------------------------------------

func (s *AdminService) GetCustomerNotifications(ctx context.Context) []domain.CustomerNotification {
	s.mu.RLock()
	defer s.mu.RUnlock()
	res := make([]domain.CustomerNotification, len(s.customerNotifs))
	copy(res, s.customerNotifs)
	return res
}

func (s *AdminService) MarkCustomerNotificationRead(ctx context.Context, id string) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	for i := range s.customerNotifs {
		if s.customerNotifs[i].ID == id {
			s.customerNotifs[i].Read = true
			return nil
		}
	}
	return nil
}

