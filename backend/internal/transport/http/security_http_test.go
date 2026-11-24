package http_test

import (
	"bytes"
	"encoding/json"
	"mime/multipart"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/littlepolocafe/backend/internal/domain"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestSecurity_UploadImage_Validation(t *testing.T) {
	router, _, _ := setupTestApp(t)

	// 1. Attempt upload of executable / script file disguised with .jpg extension -> Reject
	fakeJpgBody := &bytes.Buffer{}
	writer := multipart.NewWriter(fakeJpgBody)
	part, err := writer.CreateFormFile("file", "malicious.jpg")
	require.NoError(t, err)
	// Write plain text / shell script (invalid magic bytes)
	_, _ = part.Write([]byte("#!/bin/bash\necho 'hacked'"))
	_ = writer.Close()

	w1 := httptest.NewRecorder()
	req1, _ := http.NewRequest(http.MethodPost, "/api/v1/upload", fakeJpgBody)
	req1.Header.Set("Content-Type", writer.FormDataContentType())
	router.ServeHTTP(w1, req1)
	assert.Equal(t, http.StatusBadRequest, w1.Code)
	assert.Contains(t, w1.Body.String(), "Magic byte signature check failed")

	// 2. Attempt upload of disallowed file extension (.exe)
	exeBody := &bytes.Buffer{}
	writerExe := multipart.NewWriter(exeBody)
	partExe, err := writerExe.CreateFormFile("file", "payload.exe")
	require.NoError(t, err)
	_, _ = partExe.Write([]byte("MZ..."))
	_ = writerExe.Close()

	w2 := httptest.NewRecorder()
	req2, _ := http.NewRequest(http.MethodPost, "/api/v1/upload", exeBody)
	req2.Header.Set("Content-Type", writerExe.FormDataContentType())
	router.ServeHTTP(w2, req2)
	assert.Equal(t, http.StatusBadRequest, w2.Code)
	assert.Contains(t, w2.Body.String(), "Only JPEG, PNG, and WebP images are allowed")

	// 3. Valid PNG with authentic magic signature -> Success
	validPngBytes := []byte{0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D}
	pngBody := &bytes.Buffer{}
	writerPng := multipart.NewWriter(pngBody)
	partPng, err := writerPng.CreateFormFile("file", "valid_latte.png")
	require.NoError(t, err)
	_, _ = partPng.Write(validPngBytes)
	_ = writerPng.Close()

	w3 := httptest.NewRecorder()
	req3, _ := http.NewRequest(http.MethodPost, "/api/v1/upload", pngBody)
	req3.Header.Set("Content-Type", writerPng.FormDataContentType())
	router.ServeHTTP(w3, req3)
	assert.Equal(t, http.StatusOK, w3.Code)
	assert.Contains(t, w3.Body.String(), "/uploads/upload_")
}

func TestSecurity_Preferences_IDOR_Protection(t *testing.T) {
	router, _, _ := setupTestApp(t)

	// An unauthenticated request querying ?userId=victim-id must NOT return victim-id
	// It must safely isolate to "guest"
	w := httptest.NewRecorder()
	req, _ := http.NewRequest(http.MethodGet, "/api/v1/preferences?userId=victim-id", nil)
	router.ServeHTTP(w, req)
	assert.Equal(t, http.StatusOK, w.Code)

	var resp struct {
		Data domain.UserPreferences `json:"data"`
	}
	_ = json.Unmarshal(w.Body.Bytes(), &resp)
	assert.Equal(t, "guest", resp.Data.UserID, "Unauthenticated queries must never access other user IDs")
}

func TestSecurity_Registration_Validation_Integration(t *testing.T) {
	router, _, _ := setupTestApp(t)

	// 1. Throwaway / disposable email rejection
	regReq := domain.RegisterRequest{
		Name:     "Test User",
		Email:    "test@guerrillamail.com",
		Phone:    "+254711998877",
		Password: "SecurePassword123!",
	}
	body, _ := json.Marshal(regReq)
	w := httptest.NewRecorder()
	req, _ := http.NewRequest(http.MethodPost, "/api/v1/auth/register", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	req.RemoteAddr = "192.168.20.10:1234"
	router.ServeHTTP(w, req)
	assert.Equal(t, http.StatusBadRequest, w.Code)
	assert.Contains(t, w.Body.String(), "disposable or temporary email")

	// 2. Weak password rejection
	regReq.Email = "validuser@gmail.com"
	regReq.Password = "123456" // weak
	body2, _ := json.Marshal(regReq)
	w2 := httptest.NewRecorder()
	req2, _ := http.NewRequest(http.MethodPost, "/api/v1/auth/register", bytes.NewReader(body2))
	req2.Header.Set("Content-Type", "application/json")
	req2.RemoteAddr = "192.168.20.20:1234"
	router.ServeHTTP(w2, req2)
	assert.Equal(t, http.StatusBadRequest, w2.Code)
	assert.Contains(t, w2.Body.String(), "password")

	// 3. XSS in name rejection
	regReq.Password = "StrongPassword123!"
	regReq.Name = "<script>alert('xss')</script>"
	body3, _ := json.Marshal(regReq)
	w3 := httptest.NewRecorder()
	req3, _ := http.NewRequest(http.MethodPost, "/api/v1/auth/register", bytes.NewReader(body3))
	req3.Header.Set("Content-Type", "application/json")
	req3.RemoteAddr = "192.168.20.30:1234"
	router.ServeHTTP(w3, req3)
	assert.Equal(t, http.StatusBadRequest, w3.Code)
	assert.Contains(t, w3.Body.String(), "cannot contain HTML")
}

func TestSecurity_ForgeableClientIP_Ignored(t *testing.T) {
	router, _, _ := setupTestApp(t)

	// Sending spoofed X-Forwarded-For should not trick the engine because trusted proxies are disabled
	w := httptest.NewRecorder()
	req, _ := http.NewRequest(http.MethodGet, "/health", nil)
	req.Header.Set("X-Forwarded-For", "203.0.113.195")
	req.RemoteAddr = "127.0.0.1:12345"
	router.ServeHTTP(w, req)
	assert.Equal(t, http.StatusOK, w.Code)
	assert.True(t, strings.Contains(w.Header().Get("X-Content-Type-Options"), "nosniff"))
}
