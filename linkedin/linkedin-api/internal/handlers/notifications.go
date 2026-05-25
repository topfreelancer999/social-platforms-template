package handlers

import (
	"net/http"
	"sort"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/linkedin-clone/api/internal/middleware"
	"github.com/linkedin-clone/api/internal/models"
)

func (api *API) ListNotifications(w http.ResponseWriter, r *http.Request) {
	uid := middleware.UserID(r.Context())
	db, err := api.Store.GetDB(r.Context())
	if err != nil {
		middleware.WriteJSON(w, http.StatusInternalServerError, models.ErrorResponse{Message: err.Error()})
		return
	}
	items := []models.Notification{}
	for i := range db.Notifications {
		if db.Notifications[i].UserID == uid {
			items = append(items, db.Notifications[i])
		}
	}
	sort.Slice(items, func(i, j int) bool {
		ti, _ := time.Parse(time.RFC3339, items[i].CreatedAt)
		tj, _ := time.Parse(time.RFC3339, items[j].CreatedAt)
		return ti.After(tj)
	})
	unread := 0
	for _, n := range items {
		if !n.Read {
			unread++
		}
	}
	middleware.WriteJSON(w, http.StatusOK, map[string]any{"items": items, "unread": unread})
}

func (api *API) ReadAllNotifications(w http.ResponseWriter, r *http.Request) {
	uid := middleware.UserID(r.Context())
	_ = api.Store.Mutate(r.Context(), func(db *models.Database) error {
		for i := range db.Notifications {
			if db.Notifications[i].UserID == uid {
				db.Notifications[i].Read = true
			}
		}
		return nil
	})
	middleware.WriteJSON(w, http.StatusOK, map[string]bool{"ok": true})
}

func (api *API) ReadNotification(w http.ResponseWriter, r *http.Request) {
	uid := middleware.UserID(r.Context())
	nid := chi.URLParam(r, "id")
	_ = api.Store.Mutate(r.Context(), func(db *models.Database) error {
		for i := range db.Notifications {
			if db.Notifications[i].ID == nid && db.Notifications[i].UserID == uid {
				db.Notifications[i].Read = true
				break
			}
		}
		return nil
	})
	middleware.WriteJSON(w, http.StatusOK, map[string]bool{"ok": true})
}
