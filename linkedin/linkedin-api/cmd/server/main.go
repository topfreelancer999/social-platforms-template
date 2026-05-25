package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/linkedin-clone/api/internal/config"
	"github.com/linkedin-clone/api/internal/handlers"
	"github.com/linkedin-clone/api/internal/store"
	"github.com/redis/go-redis/v9"
)

func main() {
	cfg := config.Load()

	var rdb *redis.Client
	if cfg.RedisAddr != "" {
		rdb = redis.NewClient(&redis.Options{
			Addr:     cfg.RedisAddr,
			Password: cfg.RedisPassword,
			DB:       cfg.RedisDB,
		})
		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()
		if err := rdb.Ping(ctx).Err(); err != nil {
			log.Printf("redis unavailable (%v), using in-memory store", err)
			rdb = nil
		} else {
			log.Printf("connected to redis at %s", cfg.RedisAddr)
		}
	} else {
		log.Println("REDIS_ADDR not set, using in-memory store")
	}

	st := store.New(rdb)
	initCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	if err := st.Init(initCtx); err != nil {
		log.Fatalf("init store: %v", err)
	}

	router := handlers.NewRouter(st)
	srv := &http.Server{
		Addr:         cfg.Addr,
		Handler:      router,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
	}

	go func() {
		log.Printf("linkedin-api listening on %s", cfg.Addr)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("server: %v", err)
		}
	}()

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit
	log.Println("shutting down...")
	shutdownCtx, shutdownCancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer shutdownCancel()
	_ = srv.Shutdown(shutdownCtx)
}
