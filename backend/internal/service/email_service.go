package service

import (
	"crypto/tls"
	"encoding/base64"
	"fmt"
	"log"
	"net"
	"net/smtp"
	"os"
	"strings"
	"sync"
	"time"

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

func (s *EmailService) buildRFC5322HTMLMessage(toEmail, subject, htmlBody string) []byte {
	fromHeader := fmt.Sprintf("Little Polo Cafe <%s>", s.cfg.OTPSenderEmail)
	headers := strings.Join([]string{
		fmt.Sprintf("From: %s", fromHeader),
		fmt.Sprintf("To: %s", toEmail),
		fmt.Sprintf("Subject: %s", subject),
		"MIME-Version: 1.0",
		`Content-Type: text/html; charset="UTF-8"`,
		"",
		htmlBody,
	}, "\r\n")
	return []byte(headers)
}

func (s *EmailService) deliverMIME(toEmail string, msg []byte) bool {
	if s.cfg.Env == "test" {
		return true
	}

	// 1. Authenticated SMTP Relay (Gmail SMTP port 587 / 465)
	if s.cfg.SMTPPassword != "" && s.cfg.SMTPUser != "" {
		auth := smtp.PlainAuth("", s.cfg.SMTPUser, s.cfg.SMTPPassword, s.cfg.SMTPHost)
		addr := fmt.Sprintf("%s:%d", s.cfg.SMTPHost, s.cfg.SMTPPort)
		if err := smtp.SendMail(addr, auth, s.cfg.OTPSenderEmail, []string{toEmail}, msg); err != nil {
			log.Printf("[EmailService SMTP Error] Failed to send email via %s to %s: %v", addr, toEmail, err)
		} else {
			log.Printf("[EmailService Live] Dispatched email to %s via %s", toEmail, s.cfg.SMTPHost)
			return true
		}
	}

	// 2. If not in unit-test mode and no SMTP password set, attempt direct MX delivery with 2.5s timeout
	if s.cfg.Env != "test" && strings.Contains(toEmail, "@") {
		parts := strings.SplitN(toEmail, "@", 2)
		domain := parts[1]
		mxRecords, err := net.LookupMX(domain)
		if err == nil && len(mxRecords) > 0 {
			mxHost := strings.TrimSuffix(mxRecords[0].Host, ".")
			conn, err := net.DialTimeout("tcp", net.JoinHostPort(mxHost, "25"), 2500*time.Millisecond)
			if err == nil {
				defer conn.Close()
				_ = conn.SetDeadline(time.Now().Add(4 * time.Second))
				client, err := smtp.NewClient(conn, mxHost)
				if err == nil {
					defer client.Close()
					if ok, _ := client.Extension("STARTTLS"); ok {
						_ = client.StartTLS(&tls.Config{ServerName: mxHost})
					}
					if err := client.Mail(s.cfg.OTPSenderEmail); err == nil {
						if err := client.Rcpt(toEmail); err == nil {
							if wc, err := client.Data(); err == nil {
								_, _ = wc.Write(msg)
								if err := wc.Close(); err == nil {
									_ = client.Quit()
									log.Printf("[EmailService Direct MX] Delivered email directly to %s via %s", toEmail, mxHost)
									return true
								}
							}
						}
					}
				}
			}
		}
	}

	return false
}

// SendOTP sends a 4-digit one-time password to the designated email address.
func (s *EmailService) SendOTP(toEmail, code string) error {
	subject := fmt.Sprintf("Little Polo Cafe - Your %s Verification Code", code)
	logoB64 := getLogoBase64()

	var logoImgTag string
	if logoB64 != "" {
		logoImgTag = fmt.Sprintf(`<div style="text-align: center; margin-bottom: 20px;">
      <img src="data:image/png;base64,%s" width="84" height="84" alt="Little Polo Cafe" style="width: 84px; height: 84px; border-radius: 42px; border: 2px solid #E5E7EB; display: inline-block; object-fit: contain;" />
    </div>`, logoB64)
	}

	htmlBody := fmt.Sprintf(`<!DOCTYPE html>
<html>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; background-color: #F9FAFB; padding: 24px; color: #1F2937;">
  <div style="max-width: 480px; margin: 0 auto; background: #ffffff; border-radius: 16px; padding: 32px; border: 1px solid #E5E7EB;">
    %s
    <h2 style="color: #691414; margin-top: 0; text-align: center;">Little Polo Cafe</h2>
    <p style="font-size: 15px; line-height: 24px; text-align: center;">Your 4-digit verification code is:</p>
    <div style="background-color: #FCE7F3; border-radius: 12px; padding: 18px; text-align: center; margin: 24px 0;">
      <span style="font-size: 34px; font-weight: bold; letter-spacing: 8px; color: #691414;">%s</span>
    </div>
    <p style="font-size: 13px; color: #6B7280; line-height: 20px; text-align: center;">
      This code expires in 5 minutes. If you did not request this code, you can safely ignore this email.
    </p>
    <hr style="border: none; border-top: 1px solid #E5E7EB; margin: 24px 0;" />
    <p style="font-size: 11px; color: #9CA3AF; text-align: center;">Little Polo Cafe · Kisumu, Kenya</p>
  </div>
</body>
</html>`, logoImgTag, code)

	msg := s.buildRFC5322HTMLMessage(toEmail, subject, htmlBody)
	if s.deliverMIME(toEmail, msg) {
		return nil
	}

	// Development / Fallback mode logging (Zero Plaintext Secrets)
	log.Printf("==================================================================")
	log.Printf("[EMAIL OTP DISPATCH] From: %s -> To: %s", s.cfg.OTPSenderEmail, toEmail)
	log.Printf("[EMAIL OTP CODE]      >>> [REDACTED FOR SECURITY] <<<")
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

	htmlBody := fmt.Sprintf(`<!DOCTYPE html>
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
        <li><strong>Real-Time Tracking:</strong> Follow your orders from our doorstep live.</li>
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
</html>`, logoImgTag, userName)

	msg := s.buildRFC5322HTMLMessage(toEmail, subject, htmlBody)
	if s.deliverMIME(toEmail, msg) {
		return nil
	}

	// Development / Fallback mode logging
	log.Printf("==================================================================")
	log.Printf("[WELCOME EMAIL DISPATCH] From: %s -> To: %s", s.cfg.OTPSenderEmail, toEmail)
	log.Printf("[WELCOME EMAIL LOGO]     Logo embedded (data URI) for %s", userName)
	log.Printf("==================================================================")
	return nil
}

// SendPasswordResetConfirmationEmail sends a security confirmation email after a password reset.
// Strictly no credentials or passwords are included in this message.
func (s *EmailService) SendPasswordResetConfirmationEmail(toEmail, userName string) error {
	subject := "Little Polo Cafe - Password Reset Confirmation"
	logoB64 := getLogoBase64()

	var logoImgTag string
	if logoB64 != "" {
		logoImgTag = fmt.Sprintf(`<div style="text-align: center; margin-bottom: 20px;">
      <img src="data:image/png;base64,%s" width="84" height="84" alt="Little Polo Cafe" style="width: 84px; height: 84px; border-radius: 42px; border: 2px solid #E5E7EB; display: inline-block; object-fit: contain;" />
    </div>`, logoB64)
	}

	if strings.TrimSpace(userName) == "" {
		userName = "Valued Guest"
	}

	htmlBody := fmt.Sprintf(`<!DOCTYPE html>
<html>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; background-color: #F9FAFB; padding: 24px; color: #1F2937;">
  <div style="max-width: 480px; margin: 0 auto; background: #ffffff; border-radius: 16px; padding: 32px; border: 1px solid #E5E7EB;">
    %s
    <h2 style="color: #691414; margin-top: 0; text-align: center;">Password Reset Successful</h2>
    <p style="font-size: 15px; line-height: 24px; color: #374151; text-align: center;">
      Hello <strong>%s</strong>,
    </p>
    <p style="font-size: 15px; line-height: 24px; color: #374151; text-align: center;">
      This is a confirmation that the password for your Little Polo Cafe account has just been reset.
    </p>
    <div style="background-color: #DCFCE7; border-radius: 12px; padding: 16px; text-align: center; margin: 24px 0;">
      <span style="font-size: 14px; font-weight: 600; color: #075B35;">Your account is now secured with your new password.</span>
    </div>
    <p style="font-size: 13px; color: #6B7280; line-height: 20px; text-align: center;">
      For your security, we never include your password in emails. If you did not authorize this change, please contact Little Polo Cafe support immediately.
    </p>
    <hr style="border: none; border-top: 1px solid #E5E7EB; margin: 24px 0;" />
    <p style="font-size: 11px; color: #9CA3AF; text-align: center;">Little Polo Cafe · Kisumu, Kenya</p>
  </div>
</body>
</html>`, logoImgTag, userName)

	msg := s.buildRFC5322HTMLMessage(toEmail, subject, htmlBody)
	if s.deliverMIME(toEmail, msg) {
		return nil
	}

	log.Printf("==================================================================")
	log.Printf("[PASSWORD RESET CONFIRMATION EMAIL] From: %s -> To: %s (User: %s)", s.cfg.OTPSenderEmail, toEmail, userName)
	log.Printf("==================================================================")
	return nil
}

// SendBroadcastEmail dispatches an announcement or seasonal update email to an opted-in customer.
func (s *EmailService) SendBroadcastEmail(toEmail, userName, subject, messageContent string) error {
	logoB64 := getLogoBase64()
	logoImgTag := ""
	if logoB64 != "" {
		logoImgTag = fmt.Sprintf(`<div style="text-align: center; margin-bottom: 24px;">
      <img src="data:image/png;base64,%s" alt="Little Polo Cafe" width="120" style="display: block; margin: 0 auto; max-width: 120px; height: auto;" />
    </div>`, logoB64)
	}

	if strings.TrimSpace(userName) == "" {
		userName = "Valued Guest"
	}

	htmlBody := fmt.Sprintf(`<!DOCTYPE html>
<html>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; background-color: #F9FAFB; padding: 24px; color: #1F2937;">
  <div style="max-width: 520px; margin: 0 auto; background: #ffffff; border-radius: 16px; padding: 32px; border: 1px solid #E5E7EB; box-shadow: 0 4px 12px rgba(0,0,0,0.06);">
    %s
    <h2 style="color: #691414; margin-top: 0; text-align: center; font-size: 22px;">%s</h2>
    <p style="font-size: 15px; line-height: 24px; color: #374151;">
      Hello <strong>%s</strong>,
    </p>
    <div style="font-size: 15px; line-height: 24px; color: #374151; white-space: pre-wrap; margin: 20px 0; background-color: #F8FAFC; border-left: 4px solid #DBEAFE; padding: 16px 20px; border-radius: 8px;">
      %s
    </div>
    <div style="background-color: #DBEAFE; border-radius: 12px; padding: 16px; text-align: center; margin: 24px 0;">
      <span style="font-size: 14px; font-weight: 600; color: #07345F;">Little Polo Cafe · Kisumu, Kenya</span>
    </div>
    <p style="font-size: 12px; color: #9CA3AF; line-height: 18px; text-align: center;">
      You received this message because you opted in to email updates &amp; offers in your Little Polo Cafe account preferences. You can update your preferences anytime in the app.
    </p>
  </div>
</body>
</html>`, logoImgTag, subject, userName, messageContent)

	msg := s.buildRFC5322HTMLMessage(toEmail, subject, htmlBody)
	if s.deliverMIME(toEmail, msg) {
		return nil
	}

	log.Printf("==================================================================")
	log.Printf("[BROADCAST EMAIL] From: %s -> To: %s (User: %s)", s.cfg.OTPSenderEmail, toEmail, userName)
	log.Printf("[SUBJECT]         %s", subject)
	log.Printf("==================================================================")
	return nil
}
