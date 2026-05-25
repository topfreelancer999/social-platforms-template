package handlers

import (
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/linkedin-clone/api/internal/middleware"
	"github.com/linkedin-clone/api/internal/models"
	"github.com/linkedin-clone/api/internal/service"
	"github.com/linkedin-clone/api/internal/util"
)

func (api *API) Network(w http.ResponseWriter, r *http.Request) {
	uid := middleware.UserID(r.Context())
	db, err := api.Store.GetDB(r.Context())
	if err != nil {
		middleware.WriteJSON(w, http.StatusInternalServerError, models.ErrorResponse{Message: err.Error()})
		return
	}
	u := service.FindUser(db, uid)
	if u == nil {
		middleware.WriteJSON(w, http.StatusUnauthorized, models.ErrorResponse{Message: "Unauthorized"})
		return
	}
	invitations := []map[string]any{}
	for _, inv := range db.Invitations {
		if inv.ToUserID != uid {
			continue
		}
		from := service.FindUser(db, inv.FromUserID)
		if from != nil {
			invitations = append(invitations, map[string]any{
				"id": inv.ID, "fromUserId": inv.FromUserID, "toUserId": inv.ToUserID,
				"message": inv.Message, "createdAt": inv.CreatedAt, "from": service.ToPublicUser(from),
			})
		}
	}
	connections := []models.UserPublic{}
	for _, cid := range u.ConnectionIDs {
		if c := service.FindUser(db, cid); c != nil {
			connections = append(connections, service.ToPublicUser(c))
		}
	}
	suggestions := []models.UserPublic{}
	for i := range db.Users {
		candidate := &db.Users[i]
		if candidate.ID == uid || util.Contains(u.ConnectionIDs, candidate.ID) {
			continue
		}
		pending := false
		for _, inv := range db.Invitations {
			if (inv.FromUserID == uid && inv.ToUserID == candidate.ID) ||
				(inv.ToUserID == uid && inv.FromUserID == candidate.ID) {
				pending = true
				break
			}
		}
		if pending {
			continue
		}
		suggestions = append(suggestions, service.ToPublicUser(candidate))
		if len(suggestions) >= 8 {
			break
		}
	}
	middleware.WriteJSON(w, http.StatusOK, map[string]any{
		"invitations": invitations, "connections": connections, "suggestions": suggestions,
	})
}

func (api *API) AcceptInvitation(w http.ResponseWriter, r *http.Request) {
	invID := chi.URLParam(r, "id")
	_ = api.Store.Mutate(r.Context(), func(db *models.Database) error {
		for i, inv := range db.Invitations {
			if inv.ID != invID {
				continue
			}
			from := service.FindUser(db, inv.FromUserID)
			to := service.FindUser(db, inv.ToUserID)
			if from != nil && to != nil {
				if !util.Contains(from.ConnectionIDs, to.ID) {
					from.ConnectionIDs = append(from.ConnectionIDs, to.ID)
				}
				if !util.Contains(to.ConnectionIDs, from.ID) {
					to.ConnectionIDs = append(to.ConnectionIDs, from.ID)
				}
			}
			db.Invitations = append(db.Invitations[:i], db.Invitations[i+1:]...)
			break
		}
		return nil
	})
	middleware.WriteJSON(w, http.StatusOK, map[string]bool{"ok": true})
}

func (api *API) IgnoreInvitation(w http.ResponseWriter, r *http.Request) {
	invID := chi.URLParam(r, "id")
	_ = api.Store.Mutate(r.Context(), func(db *models.Database) error {
		for i, inv := range db.Invitations {
			if inv.ID == invID {
				db.Invitations = append(db.Invitations[:i], db.Invitations[i+1:]...)
				break
			}
		}
		return nil
	})
	middleware.WriteJSON(w, http.StatusOK, map[string]bool{"ok": true})
}
