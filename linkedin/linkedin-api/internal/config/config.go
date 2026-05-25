package config

import (
	"os"
	"strconv"
)

type Config struct {
	Addr          string
	RedisAddr     string
	RedisPassword string
	RedisDB       int
}

func Load() Config {
	db, _ := strconv.Atoi(getEnv("REDIS_DB", "0"))
	return Config{
		Addr:          getEnv("ADDR", ":8080"),
		RedisAddr:     os.Getenv("REDIS_ADDR"), // empty = in-memory store (no Redis)
		RedisPassword: os.Getenv("REDIS_PASSWORD"),
		RedisDB:       db,
	}
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
