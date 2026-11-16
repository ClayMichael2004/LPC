package domain

import (
	"database/sql/driver"
	"fmt"
	"strings"
	"time"
)

// EATLocation is the fixed East Africa Time zone (UTC+3, Nairobi/Kisumu).
var EATLocation = time.FixedZone("EAT", 3*60*60)

// EATTime wraps time.Time to ensure strict ISO 8601 formatting with the East Africa Time offset (+03:00).
type EATTime struct {
	time.Time
}

// NowEAT returns current time in East Africa Time (+03:00).
func NowEAT() EATTime {
	return EATTime{Time: time.Now().In(EATLocation)}
}

// ToEAT converts any standard time.Time into EATTime with +03:00 offset.
func ToEAT(t time.Time) EATTime {
	return EATTime{Time: t.In(EATLocation)}
}

// MarshalJSON formats the timestamp in standard RFC3339 with +03:00 offset.
func (t EATTime) MarshalJSON() ([]byte, error) {
	if t.IsZero() {
		return []byte("null"), nil
	}
	formatted := fmt.Sprintf("\"%s\"", t.In(EATLocation).Format(time.RFC3339))
	return []byte(formatted), nil
}

// UnmarshalJSON parses an RFC3339 timestamp into EATTime.
func (t *EATTime) UnmarshalJSON(b []byte) error {
	str := strings.Trim(string(b), "\"")
	if str == "null" || str == "" {
		t.Time = time.Time{}
		return nil
	}
	parsed, err := time.Parse(time.RFC3339, str)
	if err != nil {
		// Fallback for simple date formats or space separated
		parsed, err = time.Parse("2006-01-02T15:04:05Z07:00", str)
		if err != nil {
			return err
		}
	}
	t.Time = parsed.In(EATLocation)
	return nil
}

// Value implements the database/sql driver.Valuer interface.
func (t EATTime) Value() (driver.Value, error) {
	if t.IsZero() {
		return nil, nil
	}
	return t.Time, nil
}

// Scan implements the database/sql Scanner interface.
func (t *EATTime) Scan(value interface{}) error {
	if value == nil {
		t.Time = time.Time{}
		return nil
	}
	switch v := value.(type) {
	case time.Time:
		t.Time = v.In(EATLocation)
		return nil
	case string:
		parsed, err := time.Parse(time.RFC3339, v)
		if err != nil {
			return err
		}
		t.Time = parsed.In(EATLocation)
		return nil
	default:
		return fmt.Errorf("cannot scan %T into EATTime", value)
	}
}
