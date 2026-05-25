package util

import (
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"strings"
	"time"
)

const PageSize = 10

func GenerateID(prefix string) string {
	b := make([]byte, 4)
	_, _ = rand.Read(b)
	return fmt.Sprintf("%s_%d_%s", prefix, time.Now().UnixMilli(), hex.EncodeToString(b))
}

func NowISO() string {
	return time.Now().UTC().Format(time.RFC3339)
}

func Contains(slice []string, item string) bool {
	for _, s := range slice {
		if s == item {
			return true
		}
	}
	return false
}

func RemoveString(slice []string, item string) []string {
	out := make([]string, 0, len(slice))
	for _, s := range slice {
		if s != item {
			out = append(out, s)
		}
	}
	return out
}

func Lower(s string) string {
	return strings.ToLower(s)
}
