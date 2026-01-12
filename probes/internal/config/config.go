package config

import (
	"log"
	"os"
	"strconv"
)

type Config struct {
	ProbeID       string
	RedisURL      string
	WebhookURL    string
	WebhookSecret string
	DryRun        bool
}

func Load() *Config {
	probeID := getEnv("PROBE_ID", "")
	redisURL := getEnv("REDIS_URL", "")
	webhookURL := getEnv("WEBHOOK_URL", "")
	webhookSecret := getEnv("WEBHOOK_SECRET", "")
	dryRun := getEnvBool("PROBE_DRY_RUN", false)

	if probeID == "" || redisURL == "" || webhookURL == "" || webhookSecret == "" {
		log.Fatal("Missing required probe configuration")
	}

	return &Config{
		ProbeID:       probeID,
		RedisURL:      redisURL,
		WebhookURL:    webhookURL,
		WebhookSecret: webhookSecret,
		DryRun:        dryRun,
	}
}

func getEnv(key, fallback string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return fallback
}

func getEnvBool(key string, fallback bool) bool {
	if value := os.Getenv(key); value != "" {
		parsed, err := strconv.ParseBool(value)
		if err == nil {
			return parsed
		}
	}
	return fallback
}
