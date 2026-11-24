package service

import (
	"errors"
	"html"
	"regexp"
	"strings"
	"unicode"
)

var (
	ErrDisposableEmail   = errors.New("disposable or temporary email addresses are not permitted. Please use a valid personal or work email address.")
	ErrWeakPassword      = errors.New("password must be at least 8 characters long and contain both letters and numbers")
	ErrCommonPassword    = errors.New("this password is too common or easily guessable. Please choose a stronger password.")
	ErrInvalidPhone      = errors.New("invalid phone number format. Please provide a valid phone number with country code (e.g. +254 700 000 000)")
	ErrInvalidName       = errors.New("name must be between 2 and 70 characters long and cannot contain HTML or script tags")
	ErrTooManyOTPRequests = errors.New("too many verification codes requested for this account. Please wait 10 minutes before requesting another code.")
	ErrOTPAttemptsExceeded = errors.New("maximum verification attempts exceeded. This verification code has been invalidated for security. Please request a new code.")
	ErrAccountLocked     = errors.New("account temporarily locked due to consecutive failed login attempts. Please wait 15 minutes or reset your password using verification code.")
)

// List of disposable/burner/temporary email domains
var disposableEmailDomains = map[string]struct{}{
	"mailinator.com":      {},
	"guerrillamail.com":   {},
	"guerrillamail.net":   {},
	"guerrillamail.org":   {},
	"tempmail.com":        {},
	"temp-mail.org":       {},
	"10minutemail.com":    {},
	"10minutemail.net":    {},
	"throwawaymail.com":   {},
	"yopmail.com":         {},
	"sharklasers.com":     {},
	"dispostable.com":     {},
	"trashmail.com":       {},
	"trashmail.net":       {},
	"getairmail.com":      {},
	"mohmal.com":          {},
	"fakeinbox.com":       {},
	"crazymailing.com":    {},
	"generator.email":     {},
	"emailondeck.com":     {},
	"mytemp.email":        {},
	"burnermail.io":       {},
	"dropmail.me":         {},
	"inboxkitten.com":     {},
	"nada.ltd":            {},
	"getnada.com":         {},
	"maildrop.cc":         {},
	"tempail.com":         {},
	"fakemailgenerator.com": {},
}

// Common easily guessable passwords
var commonPasswords = map[string]struct{}{
	"password":   {},
	"password1":  {},
	"password123": {},
	"12345678":   {},
	"123456789":  {},
	"qwerty123":  {},
	"admin123":   {},
	"letmein123": {},
	"welcome1":   {},
}

var phoneRegex = regexp.MustCompile(`^\+?[1-9]\d{8,14}$`)

// IsDisposableEmail checks whether the email's domain belongs to a disposable email provider.
func IsDisposableEmail(email string) bool {
	parts := strings.Split(email, "@")
	if len(parts) != 2 {
		return false
	}
	domain := strings.ToLower(strings.TrimSpace(parts[1]))
	_, exists := disposableEmailDomains[domain]
	return exists
}

// ValidatePassword enforces password length, complexity, and common password rejection.
func ValidatePassword(password string) error {
	if len(password) < 8 {
		return ErrWeakPassword
	}

	lower := strings.ToLower(password)
	if _, common := commonPasswords[lower]; common {
		return ErrCommonPassword
	}

	hasLetter := false
	hasDigit := false
	for _, c := range password {
		if unicode.IsLetter(c) {
			hasLetter = true
		} else if unicode.IsDigit(c) {
			hasDigit = true
		}
	}

	if !hasLetter || !hasDigit {
		return ErrWeakPassword
	}

	return nil
}

// ValidatePhone validates international or Kenyan phone numbers.
func ValidatePhone(phone string) error {
	clean := strings.ReplaceAll(phone, " ", "")
	clean = strings.ReplaceAll(clean, "-", "")
	if !phoneRegex.MatchString(clean) {
		return ErrInvalidPhone
	}
	return nil
}

// SanitizeAndValidateName cleanses HTML/script entities and verifies length.
func SanitizeAndValidateName(name string) (string, error) {
	clean := strings.TrimSpace(name)
	if len(clean) < 2 || len(clean) > 70 {
		return "", ErrInvalidName
	}

	// Reject raw HTML tags
	if strings.ContainsAny(clean, "<>") {
		return "", ErrInvalidName
	}

	escaped := html.EscapeString(clean)
	return escaped, nil
}
