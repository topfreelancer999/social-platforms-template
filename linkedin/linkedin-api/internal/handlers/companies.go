package handlers

import (
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/linkedin-clone/api/internal/middleware"
	"github.com/linkedin-clone/api/internal/models"
	"github.com/linkedin-clone/api/internal/service"
	"github.com/linkedin-clone/api/internal/util"
)

func (api *API) GetCompany(w http.ResponseWriter, r *http.Request) {
	slug := chi.URLParam(r, "slug")
	db, err := api.Store.GetDB(r.Context())
	if err != nil {
		middleware.WriteJSON(w, http.StatusInternalServerError, models.ErrorResponse{Message: err.Error()})
		return
	}
	var company *models.Company
	for i := range db.Companies {
		c := &db.Companies[i]
		if c.Slug == slug || c.ID == slug {
			company = c
			break
		}
	}
	if company == nil {
		middleware.WriteJSON(w, http.StatusNotFound, models.ErrorResponse{Message: "Not found"})
		return
	}
	posts := []map[string]any{}
	count := 0
	for i := range db.Posts {
		if db.Posts[i].CompanyID != company.ID {
			continue
		}
		if count >= 5 {
			break
		}
		author := service.FindUser(db, db.Posts[i].AuthorID)
		if author != nil {
			posts = append(posts, map[string]any{
				"id": db.Posts[i].ID, "content": db.Posts[i].Content,
				"author": service.ToPublicUser(author),
			})
		}
		count++
	}
	jobs := []models.Job{}
	for i := range db.Jobs {
		if db.Jobs[i].CompanyID == company.ID {
			jobs = append(jobs, db.Jobs[i])
		}
	}
	people := []models.UserPublic{}
	for _, eid := range company.EmployeeIDs {
		if u := service.FindUser(db, eid); u != nil {
			people = append(people, service.ToPublicUser(u))
		}
	}
	middleware.WriteJSON(w, http.StatusOK, map[string]any{
		"company": company, "posts": posts, "jobs": jobs, "people": people,
	})
}

func (api *API) FollowCompany(w http.ResponseWriter, r *http.Request) {
	uid := middleware.UserID(r.Context())
	id := chi.URLParam(r, "id")
	_ = api.Store.Mutate(r.Context(), func(db *models.Database) error {
		for i := range db.Companies {
			c := &db.Companies[i]
			if c.ID != id && c.Slug != id {
				continue
			}
			if !util.Contains(c.FollowerIDs, uid) {
				c.FollowerIDs = append(c.FollowerIDs, uid)
			}
			break
		}
		return nil
	})
	middleware.WriteJSON(w, http.StatusOK, map[string]bool{"ok": true})
}
