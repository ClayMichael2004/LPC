package config

import (
	"bufio"
	"os"
	"strconv"
	"strings"
)

type Config struct {
	Port               string
	Env                string
	DatabaseURL        string
	RedisURL           string
	RedisPassword      string
	JWTSecret          string
	JWTExpiryHours     int
	OTPSenderEmail     string
	SMTPHost           string
	SMTPPort           int
	SMTPUser           string
	SMTPPassword       string
	CORSAllowedOrigins string
	AdminEmail         string
	AdminPassword      string
}

func loadDotEnv() {
	candidates := []string{".env", "../.env", "../../.env"}
	for _, path := range candidates {
		f, err := os.Open(path)
		if err != nil {
			continue
		}
		scanner := bufio.NewScanner(f)
		for scanner.Scan() {
			line := strings.TrimSpace(scanner.Text())
			if line == "" || strings.HasPrefix(line, "#") {
				continue
			}
			parts := strings.SplitN(line, "=", 2)
			if len(parts) != 2 {
				continue
			}
			key := strings.TrimSpace(parts[0])
			val := strings.TrimSpace(parts[1])
			val = strings.Trim(val, `"'`)
			if _, exists := os.LookupEnv(key); !exists && val != "" {
				_ = os.Setenv(key, val)
			}
		}
		_ = f.Close()
		break
	}
}

func Load() *Config {
	loadDotEnv()

	// Strip spaces from Google 16-char App Passwords if present
	rawSMTPPass := strings.ReplaceAll(getEnv("SMTP_PASSWORD", ""), " ", "")

	return &Config{
		Port:               getEnv("PORT", "8085"),
		Env:                getEnv("ENV", "development"),
		DatabaseURL:        getEnv("DATABASE_URL", "postgres://postgres:postgrespassword@localhost:5435/lpc_db?sslmode=disable"),
		RedisURL:           getEnv("REDIS_URL", "localhost:6380"),
		RedisPassword:      getEnv("REDIS_PASSWORD", ""),
		JWTSecret:          getEnv("JWT_SECRET", "little-polo-cafe-secret-key-east-africa-2026"),
		JWTExpiryHours:     getEnvInt("JWT_EXPIRY_HOURS", 168),
		OTPSenderEmail:     getEnv("OTP_SENDER_EMAIL", "mikewillmakeit2004@gmail.com"),
		SMTPHost:           getEnv("SMTP_HOST", "smtp.gmail.com"),
		SMTPPort:           getEnvInt("SMTP_PORT", 587),
		SMTPUser:           getEnv("SMTP_USER", "mikewillmakeit2004@gmail.com"),
		SMTPPassword:       rawSMTPPass,
		CORSAllowedOrigins: getEnv("CORS_ALLOWED_ORIGINS", "*"),
		AdminEmail:         getEnv("ADMIN_EMAIL", "mikewillmakeit2004@gmail.com"),
		AdminPassword:      getEnv("ADMIN_PASSWORD", "AdminLPC2026!"),
	}
}

func getEnv(key, defaultVal string) string {
	if val, ok := os.LookupEnv(key); ok && val != "" {
		return val
	}
	return defaultVal
}

func getEnvInt(key string, defaultVal int) int {
	if val, ok := os.LookupEnv(key); ok && val != "" {
		if intVal, err := strconv.Atoi(val); err == nil {
			return intVal
		}
	}
	return defaultVal
}
