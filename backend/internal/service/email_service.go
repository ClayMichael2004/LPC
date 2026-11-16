package service

import (
	"encoding/base64"
	"fmt"
	"log"
	"net/smtp"
	"os"
	"sync"

	"github.com/littlepolocafe/backend/internal/config"
)

var (
	logoBase64Once   sync.Once
	cachedLogoBase64 string
)

func getLogoBase64() string {
	logoBase64Once.Do(func() {
		candidates := []string{
			"assets/images/little-polo-logo.png",
			"../assets/images/little-polo-logo.png",
			"../../assets/images/little-polo-logo.png",
			"../../../assets/images/little-polo-logo.png",
		}
		for _, path := range candidates {
			data, err := os.ReadFile(path)
			if err == nil && len(data) > 0 {
				cachedLogoBase64 = base64.StdEncoding.EncodeToString(data)
				log.Printf("[EmailService] Loaded Little Polo Cafe logo (%d bytes) from %s", len(data), path)
				return
			}
		}
	})
	return cachedLogoBase64
}

type EmailService struct {
	cfg *config.Config
}

func NewEmailService(cfg *config.Config) *EmailService {
	return &EmailService{cfg: cfg}
}

// SendOTP sends a 6-digit one-time password to the designated email address.
func (s *EmailService) SendOTP(toEmail, code string) error {
	subject := "Little Polo Cafe - Your Verification Code"
	body := fmt.Sprintf(`Subject: %s
MIME-Version: 1.0
Content-Type: text/html; charset="UTF-8"

<!DOCTYPE html>
<html>
<body style="font-family: Arial, sans-serif; background-color: #F9FAFB; padding: 24px; color: #1F2937;">
  <div style="max-width: 480px; margin: 0 auto; background: #ffffff; border-radius: 16px; padding: 32px; border: 1px solid #E5E7EB;">
    <h2 style="color: #691414; margin-top: 0;">Little Polo Cafe</h2>
    <p style="font-size: 15px; line-height: 24px;">Your 6-digit sign-in verification code is:</p>
    <div style="background-color: #FCE7F3; border-radius: 12px; padding: 16px; text-align: center; margin: 24px 0;">
      <span style="font-size: 32px; font-weight: bold; letter-spacing: 6px; color: #691414;">%s</span>
    </div>
    <p style="font-size: 13px; color: #6B7280; line-height: 20px;">
      This code expires in 5 minutes. If you did not request this code, you can safely ignore this email.
    </p>
    <hr style="border: none; border-top: 1px solid #E5E7EB; margin: 24px 0;" />
    <p style="font-size: 11px; color: #9CA3AF; text-align: center;">Little Polo Cafe · Kisumu, Kenya</p>
  </div>
</body>
</html>
`, subject, code)

	// If SMTP is fully configured, attempt live dispatch
	if s.cfg.SMTPPassword != "" && s.cfg.SMTPUser != "" {
		auth := smtp.PlainAuth("", s.cfg.SMTPUser, s.cfg.SMTPPassword, s.cfg.SMTPHost)
		addr := fmt.Sprintf("%s:%d", s.cfg.SMTPHost, s.cfg.SMTPPort)
		err := smtp.SendMail(addr, auth, s.cfg.OTPSenderEmail, []string{toEmail}, []byte(body))
		if err != nil {
			log.Printf("[Email OTP Error] Failed to send live email via SMTP to %s: %v. Falling back to console log.", toEmail, err)
		} else {
			log.Printf("[Email OTP Live] Successfully dispatched OTP email to %s via %s", toEmail, s.cfg.SMTPHost)
			return nil
		}
	}

	// Development / Fallback mode logging
	log.Printf("==================================================================")
	log.Printf("[EMAIL OTP DISPATCH] From: %s -> To: %s", s.cfg.OTPSenderEmail, toEmail)
	log.Printf("[EMAIL OTP CODE]      >>> %s <<<", code)
	log.Printf("==================================================================")
	return nil
}

// SendWelcomeEmail sends a welcome email with the Little Polo Cafe logo to a newly registered customer.
func (s *EmailService) SendWelcomeEmail(toEmail, userName string) error {
	subject := "Welcome to Little Polo Cafe! ☕"
	logoB64 := getLogoBase64()

	var logoImgTag string
	if logoB64 != "" {
		logoImgTag = fmt.Sprintf(`<div style="text-align: center; margin-bottom: 24px;">
      <img src="data:image/png;base64,%s" width="96" height="96" alt="Little Polo Cafe Logo" style="width: 96px; height: 96px; border-radius: 48px; border: 2px solid #E5E7EB; display: inline-block; object-fit: contain;" />
    </div>`, logoB64)
	} else {
		logoImgTag = `<div style="text-align: center; margin-bottom: 24px;">
      <div style="display: inline-block; width: 80px; height: 80px; line-height: 80px; border-radius: 40px; background-color: #691414; color: #ffffff; font-size: 28px; font-weight: bold;">LPC</div>
    </div>`
	}

	body := fmt.Sprintf(`Subject: %s
MIME-Version: 1.0
Content-Type: text/html; charset="UTF-8"

<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Welcome to Little Polo Cafe</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #F9FAFB; padding: 28px 16px; margin: 0; color: #1F2937;">
  <div style="max-width: 520px; margin: 0 auto; background: #ffffff; border-radius: 20px; padding: 36px 28px; border: 1px solid #E5E7EB; box-shadow: 0 4px 12px rgba(0,0,0,0.06);">
    %s
    <h1 style="color: #691414; font-size: 24px; font-weight: 700; text-align: center; margin: 0 0 12px 0;">Welcome to Little Polo Cafe!</h1>
    <p style="font-size: 15px; line-height: 24px; color: #374151; margin-bottom: 16px; text-align: center;">
      Hello <strong>%s</strong>, thank you for registering with Little Polo Cafe.
    </p>

    <div style="background-color: #F8FAFC; border-radius: 14px; padding: 20px; margin: 24px 0; border: 1px solid #E2E8F0;">
      <h3 style="margin-top: 0; color: #0F172A; font-size: 16px; font-weight: 600;">Your LPC Account is Ready:</h3>
      <ul style="margin: 0; padding-left: 20px; font-size: 14px; color: #475569; line-height: 22px;">
        <li style="margin-bottom: 8px;"><strong>Handcrafted Coffee:</strong> Specialty espresso drinks, pour-overs, and cold brews roasted to perfection.</li>
        <li style="margin-bottom: 8px;"><strong>Artisanal Kitchen:</strong> Gourmet burgers, avocado toasts, and sourdough creations in Kisumu.</li>
        <li style="margin-bottom: 8px;"><strong>Community Activities:</strong> Sunday painting sessions, workshops, and cafe gatherings.</li>
        <li><strong>Real-Time Tracking:</strong> Follow your orders from our kitchen to your doorstep live.</li>
      </ul>
    </div>

    <div style="text-align: center; margin: 28px 0 20px 0;">
      <p style="font-size: 14px; color: #4B5563; margin-bottom: 16px;">
        Please sign in with your credentials on the Little Polo Cafe mobile app to begin exploring.
      </p>
      <div style="display: inline-block; background-color: #691414; color: #ffffff; padding: 12px 32px; border-radius: 10px; font-size: 15px; font-weight: 600; text-decoration: none;">
        Karibu Little Polo Cafe
      </div>
    </div>

    <hr style="border: none; border-top: 1px solid #E5E7EB; margin: 28px 0 20px 0;" />
    <p style="font-size: 12px; color: #9CA3AF; text-align: center; margin: 0; line-height: 18px;">
      Little Polo Cafe · Kisumu, Kenya<br/>
      Need assistance? Contact us anytime.
    </p>
  </div>
</body>
</html>
`, subject, logoImgTag, userName)

	// If SMTP is fully configured, attempt live dispatch
	if s.cfg.SMTPPassword != "" && s.cfg.SMTPUser != "" {
		auth := smtp.PlainAuth("", s.cfg.SMTPUser, s.cfg.SMTPPassword, s.cfg.SMTPHost)
		addr := fmt.Sprintf("%s:%d", s.cfg.SMTPHost, s.cfg.SMTPPort)
		err := smtp.SendMail(addr, auth, s.cfg.OTPSenderEmail, []string{toEmail}, []byte(body))
		if err != nil {
			log.Printf("[Welcome Email Error] Failed to send live email via SMTP to %s: %v. Falling back to console log.", toEmail, err)
		} else {
			log.Printf("[Welcome Email Live] Successfully dispatched welcome email with logo to %s via %s", toEmail, s.cfg.SMTPHost)
			return nil
		}
	}

	// Development / Fallback mode logging
	log.Printf("==================================================================")
	log.Printf("[WELCOME EMAIL DISPATCH] From: %s -> To: %s", s.cfg.OTPSenderEmail, toEmail)
	log.Printf("[WELCOME EMAIL LOGO]     Logo embedded (data URI) for %s", userName)
	log.Printf("==================================================================")
	return nil
}

