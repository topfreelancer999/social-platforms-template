package store

import (
	"context"
	_ "embed"
	"encoding/json"
	"sync"
	"time"

	"github.com/linkedin-clone/api/internal/models"
	"github.com/redis/go-redis/v9"
)

//go:embed seed.json
var seedJSON []byte

const dbKey = "linkedin:db"

type Store struct {
	rdb *redis.Client
	mu  sync.Mutex // local fallback when redis unavailable
	mem *models.Database
}

func New(rdb *redis.Client) *Store {
	return &Store{rdb: rdb}
}

func (s *Store) Ping(ctx context.Context) error {
	if s.rdb == nil {
		return nil
	}
	return s.rdb.Ping(ctx).Err()
}

func (s *Store) Init(ctx context.Context) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	if s.rdb == nil {
		db, err := loadSeed()
		if err != nil {
			return err
		}
		s.mem = db
		return nil
	}
	n, err := s.rdb.Exists(ctx, dbKey).Result()
	if err != nil {
		return err
	}
	if n > 0 {
		return nil
	}
	db, err := loadSeed()
	if err != nil {
		return err
	}
	return s.saveDBLocked(ctx, db)
}

func loadSeed() (*models.Database, error) {
	var db models.Database
	if err := json.Unmarshal(seedJSON, &db); err != nil {
		return nil, err
	}
	if db.Sessions == nil {
		db.Sessions = map[string]string{}
	}
	if db.SavedJobIds == nil {
		db.SavedJobIds = map[string][]string{}
	}
	return &db, nil
}

func (s *Store) GetDB(ctx context.Context) (*models.Database, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	return s.getDBLocked(ctx)
}

func (s *Store) getDBLocked(ctx context.Context) (*models.Database, error) {
	if s.rdb == nil {
		if s.mem == nil {
			db, err := loadSeed()
			if err != nil {
				return nil, err
			}
			s.mem = db
		}
		copy := *s.mem
		return &copy, nil
	}
	data, err := s.rdb.Get(ctx, dbKey).Bytes()
	if err == redis.Nil {
		db, err := loadSeed()
		if err != nil {
			return nil, err
		}
		_ = s.saveDBLocked(ctx, db)
		return db, nil
	}
	if err != nil {
		return nil, err
	}
	var db models.Database
	if err := json.Unmarshal(data, &db); err != nil {
		return nil, err
	}
	return &db, nil
}

func (s *Store) saveDBLocked(ctx context.Context, db *models.Database) error {
	if s.rdb == nil {
		copy := *db
		s.mem = &copy
		return nil
	}
	data, err := json.Marshal(db)
	if err != nil {
		return err
	}
	return s.rdb.Set(ctx, dbKey, data, 0).Err()
}

func (s *Store) Mutate(ctx context.Context, fn func(*models.Database) error) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	db, err := s.getDBLocked(ctx)
	if err != nil {
		return err
	}
	if err := fn(db); err != nil {
		return err
	}
	return s.saveDBLocked(ctx, db)
}

func (s *Store) Reset(ctx context.Context) error {
	if s.rdb != nil {
		_ = s.rdb.Del(ctx, dbKey)
	}
	s.mem = nil
	return s.Init(ctx)
}

func (s *Store) SessionUserID(ctx context.Context, token string) (string, bool) {
	if token == "" {
		return "", false
	}
	db, err := s.GetDB(ctx)
	if err != nil {
		return "", false
	}
	uid, ok := db.Sessions[token]
	return uid, ok
}

func (s *Store) SetSession(ctx context.Context, token, userID string) error {
	return s.Mutate(ctx, func(db *models.Database) error {
		if db.Sessions == nil {
			db.Sessions = map[string]string{}
		}
		db.Sessions[token] = userID
		return nil
	})
}

// SessionTTL for optional redis session keys (future)
const SessionTTL = 7 * 24 * time.Hour
