package handlers

import (
	"encoding/json"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/linkedin-clone/api/internal/middleware"
	"github.com/linkedin-clone/api/internal/models"
	"github.com/linkedin-clone/api/internal/service"
	"github.com/linkedin-clone/api/internal/util"
)

func (api *API) GetUser(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	viewerID := middleware.UserID(r.Context())
	db, err := api.Store.GetDB(r.Context())
	if err != nil {
		middleware.WriteJSON(w, http.StatusInternalServerError, models.ErrorResponse{Message: err.Error()})
		return
	}
	u := service.FindUser(db, id)
	if u == nil {
		middleware.WriteJSON(w, http.StatusNotFound, models.ErrorResponse{Message: "Not found"})
		return
	}
	posts := []map[string]any{}
	for i := range db.Posts {
		p := &db.Posts[i]
		if p.AuthorID == u.ID && p.RepostOfID == "" {
			ep := service.EnrichPost(db, p)
			posts = append(posts, map[string]any{
				"id": p.ID, "content": p.Content, "createdAt": p.CreatedAt,
				"author": service.ToPublicUser(u), "totalReactions": ep.TotalReactions,
			})
			if len(posts) >= 10 {
				break
			}
		}
	}
	degree := service.ConnectionDegree(viewerID, u, db)
	middleware.WriteJSON(w, http.StatusOK, map[string]any{
		"user": service.ToPublicUser(u), "degree": degree, "posts": posts,
	})
}

func (api *API) PatchMe(w http.ResponseWriter, r *http.Request) {
	uid := middleware.UserID(r.Context())
	var patch map[string]json.RawMessage
	if err := json.NewDecoder(r.Body).Decode(&patch); err != nil {
		middleware.WriteJSON(w, http.StatusBadRequest, models.ErrorResponse{Message: "invalid body"})
		return
	}
	// Skills go through /api/users/{id}/skills so endorsement rules can't be bypassed here.
	delete(patch, "skills")
	var updated models.UserPublic
	err := api.Store.Mutate(r.Context(), func(db *models.Database) error {
		for i := range db.Users {
			if db.Users[i].ID != uid {
				continue
			}
			data, _ := json.Marshal(patch)
			_ = json.Unmarshal(data, &db.Users[i])
			updated = service.ToPublicUser(&db.Users[i])
			return nil
		}
		return nil
	})
	if err != nil {
		middleware.WriteJSON(w, http.StatusInternalServerError, models.ErrorResponse{Message: err.Error()})
		return
	}
	middleware.WriteJSON(w, http.StatusOK, updated)
}

func (api *API) Connect(w http.ResponseWriter, r *http.Request) {
	uid := middleware.UserID(r.Context())
	targetID := chi.URLParam(r, "id")
	_ = api.Store.Mutate(r.Context(), func(db *models.Database) error {
		db.Invitations = append(db.Invitations, models.Invitation{
			ID: util.GenerateID("inv"), FromUserID: uid, ToUserID: targetID, CreatedAt: util.NowISO(),
		})
		return nil
	})
	middleware.WriteJSON(w, http.StatusOK, map[string]string{"status": "pending_sent"})
}

func (api *API) Follow(w http.ResponseWriter, r *http.Request) {
	uid := middleware.UserID(r.Context())
	targetID := chi.URLParam(r, "id")
	_ = api.Store.Mutate(r.Context(), func(db *models.Database) error {
		u := service.FindUser(db, uid)
		t := service.FindUser(db, targetID)
		if u != nil && !util.Contains(u.FollowingIDs, targetID) {
			u.FollowingIDs = append(u.FollowingIDs, targetID)
		}
		if t != nil && !util.Contains(t.FollowerIDs, uid) {
			t.FollowerIDs = append(t.FollowerIDs, uid)
		}
		return nil
	})
	middleware.WriteJSON(w, http.StatusOK, map[string]bool{"ok": true})
}
