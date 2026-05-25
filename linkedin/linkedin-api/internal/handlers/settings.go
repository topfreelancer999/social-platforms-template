package handlers

import (
	"encoding/json"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/linkedin-clone/api/internal/middleware"
	"github.com/linkedin-clone/api/internal/models"
	"github.com/linkedin-clone/api/internal/service"
)

func (api *API) GetSettings(w http.ResponseWriter, r *http.Request) {
	uid := middleware.UserID(r.Context())
	db, err := api.Store.GetDB(r.Context())
	if err != nil {
		middleware.WriteJSON(w, http.StatusInternalServerError, models.ErrorResponse{Message: err.Error()})
		return
	}
	var settings *models.Settings
	for i := range db.Settings {
		if db.Settings[i].UserID == uid {
			settings = &db.Settings[i]
			break
		}
	}
	email := ""
	if u := service.FindUser(db, uid); u != nil {
		email = u.Email
	}
	middleware.WriteJSON(w, http.StatusOK, map[string]any{"settings": settings, "email": email})
}

func (api *API) PatchSettings(w http.ResponseWriter, r *http.Request) {
	uid := middleware.UserID(r.Context())
	var patch models.Settings
	_ = json.NewDecoder(r.Body).Decode(&patch)
	var updated *models.Settings
	_ = api.Store.Mutate(r.Context(), func(db *models.Database) error {
		for i := range db.Settings {
			if db.Settings[i].UserID != uid {
				continue
			}
			db.Settings[i].EmailNotifications = patch.EmailNotifications
			db.Settings[i].PushNotifications = patch.PushNotifications
			if patch.ProfileVisibility != "" {
				db.Settings[i].ProfileVisibility = patch.ProfileVisibility
			}
			db.Settings[i].ActivityVisibility = patch.ActivityVisibility
			if patch.MessagingFrom != "" {
				db.Settings[i].MessagingFrom = patch.MessagingFrom
			}
			if patch.Language != "" {
				db.Settings[i].Language = patch.Language
			}
			if patch.Theme != "" {
				db.Settings[i].Theme = patch.Theme
			}
			updated = &db.Settings[i]
			break
		}
		return nil
	})
	middleware.WriteJSON(w, http.StatusOK, updated)
}

func (api *API) ListEvents(w http.ResponseWriter, r *http.Request) {
	db, err := api.Store.GetDB(r.Context())
	if err != nil {
		middleware.WriteJSON(w, http.StatusInternalServerError, models.ErrorResponse{Message: err.Error()})
		return
	}
	middleware.WriteJSON(w, http.StatusOK, db.Events)
}

func (api *API) RSVPEvent(w http.ResponseWriter, r *http.Request) {
	uid := middleware.UserID(r.Context())
	id := chi.URLParam(r, "id")
	_ = api.Store.Mutate(r.Context(), func(db *models.Database) error {
		for i := range db.Events {
			if db.Events[i].ID == id {
				found := false
				for _, a := range db.Events[i].AttendeeIDs {
					if a == uid {
						found = true
						break
					}
				}
				if !found {
					db.Events[i].AttendeeIDs = append(db.Events[i].AttendeeIDs, uid)
				}
				break
			}
		}
		return nil
	})
	middleware.WriteJSON(w, http.StatusOK, map[string]bool{"ok": true})
}
