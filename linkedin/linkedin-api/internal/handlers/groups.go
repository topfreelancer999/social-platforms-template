package handlers

import (
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/linkedin-clone/api/internal/middleware"
	"github.com/linkedin-clone/api/internal/models"
	"github.com/linkedin-clone/api/internal/service"
	"github.com/linkedin-clone/api/internal/util"
)

func (api *API) ListGroups(w http.ResponseWriter, r *http.Request) {
	db, err := api.Store.GetDB(r.Context())
	if err != nil {
		middleware.WriteJSON(w, http.StatusInternalServerError, models.ErrorResponse{Message: err.Error()})
		return
	}
	middleware.WriteJSON(w, http.StatusOK, db.Groups)
}

func (api *API) GetGroup(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	db, err := api.Store.GetDB(r.Context())
	if err != nil {
		middleware.WriteJSON(w, http.StatusInternalServerError, models.ErrorResponse{Message: err.Error()})
		return
	}
	var group *models.Group
	for i := range db.Groups {
		if db.Groups[i].ID == id {
			group = &db.Groups[i]
			break
		}
	}
	if group == nil {
		middleware.WriteJSON(w, http.StatusNotFound, models.ErrorResponse{Message: "Not found"})
		return
	}
	members := []models.UserPublic{}
	for _, mid := range group.MemberIDs {
		if u := service.FindUser(db, mid); u != nil {
			members = append(members, service.ToPublicUser(u))
		}
	}
	posts := []map[string]any{}
	for i := range db.Posts {
		if db.Posts[i].GroupID != group.ID {
			continue
		}
		author := service.FindUser(db, db.Posts[i].AuthorID)
		if author != nil {
			posts = append(posts, map[string]any{
				"id": db.Posts[i].ID, "content": db.Posts[i].Content,
				"author": service.ToPublicUser(author),
			})
		}
	}
	middleware.WriteJSON(w, http.StatusOK, map[string]any{
		"group": group, "members": members, "posts": posts,
	})
}

func (api *API) JoinGroup(w http.ResponseWriter, r *http.Request) {
	uid := middleware.UserID(r.Context())
	id := chi.URLParam(r, "id")
	_ = api.Store.Mutate(r.Context(), func(db *models.Database) error {
		for i := range db.Groups {
			if db.Groups[i].ID == id && !util.Contains(db.Groups[i].MemberIDs, uid) {
				db.Groups[i].MemberIDs = append(db.Groups[i].MemberIDs, uid)
			}
		}
		return nil
	})
	middleware.WriteJSON(w, http.StatusOK, map[string]bool{"ok": true})
}

func (api *API) LeaveGroup(w http.ResponseWriter, r *http.Request) {
	uid := middleware.UserID(r.Context())
	id := chi.URLParam(r, "id")
	_ = api.Store.Mutate(r.Context(), func(db *models.Database) error {
		for i := range db.Groups {
			if db.Groups[i].ID == id {
				db.Groups[i].MemberIDs = util.RemoveString(db.Groups[i].MemberIDs, uid)
			}
		}
		return nil
	})
	middleware.WriteJSON(w, http.StatusOK, map[string]bool{"ok": true})
}
