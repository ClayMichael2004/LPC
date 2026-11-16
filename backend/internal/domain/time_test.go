package domain_test

import (
	"encoding/json"
	"strings"
	"testing"
	"time"

	"github.com/littlepolocafe/backend/internal/domain"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestEATTime_Formatting(t *testing.T) {
	nowEAT := domain.NowEAT()
	data, err := json.Marshal(nowEAT)
	require.NoError(t, err)

	jsonStr := string(data)
	// East Africa Time must have +03:00 offset
	assert.True(t, strings.HasSuffix(jsonStr, "+03:00\""), "Timestamp should end with +03:00, got: %s", jsonStr)

	// Test unmarshaling
	var parsed domain.EATTime
	err = json.Unmarshal(data, &parsed)
	require.NoError(t, err)
	assert.Equal(t, nowEAT.Unix(), parsed.Unix())
}

func TestEATTime_ToEAT(t *testing.T) {
	utcTime := time.Date(2026, 11, 16, 18, 0, 0, 0, time.UTC)
	eat := domain.ToEAT(utcTime)

	// 18:00 UTC = 21:00 EAT
	assert.Equal(t, 21, eat.Hour())
	assert.Equal(t, 16, eat.Day())

	data, err := json.Marshal(eat)
	require.NoError(t, err)
	assert.Contains(t, string(data), "2026-11-16T21:00:00+03:00")
}

func TestEATTime_SQLValuerScanner(t *testing.T) {
	nowEAT := domain.NowEAT()
	val, err := nowEAT.Value()
	require.NoError(t, err)
	assert.NotNil(t, val)

	var scanned domain.EATTime
	err = scanned.Scan(val)
	require.NoError(t, err)
	assert.Equal(t, nowEAT.Unix(), scanned.Unix())
}
