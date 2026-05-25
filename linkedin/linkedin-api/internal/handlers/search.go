package handlers

import (
	"net/http"
	"strings"

	"github.com/linkedin-clone/api/internal/middleware"
	"github.com/linkedin-clone/api/internal/models"
	"github.com/linkedin-clone/api/internal/service"
)

func (api *API) Search(w http.ResponseWriter, r *http.Request) {
	q := strings.ToLower(r.URL.Query().Get("q"))
	tab := r.URL.Query().Get("type")
	if tab == "" {
		tab = "all"
	}
	db, err := api.Store.GetDB(r.Context())
	if err != nil {
		middleware.WriteJSON(w, http.StatusInternalServerError, models.ErrorResponse{Message: err.Error()})
		return
	}
	match := func(parts ...string) bool {
		if q == "" {
			return true
		}
		for _, p := range parts {
			if strings.Contains(strings.ToLower(p), q) {
				return true
			}
		}
		return false
	}
	result := map[string]any{}
	if tab == "all" || tab == "people" {
		people := []models.UserPublic{}
		for i := range db.Users {
			u := &db.Users[i]
			if match(u.FirstName+" "+u.LastName, u.Headline, u.Location) {
				people = append(people, service.ToPublicUser(u))
			}
		}
		result["people"] = people
	}
	if tab == "all" || tab == "jobs" {
		jobs := []map[string]any{}
		for i := range db.Jobs {
			j := &db.Jobs[i]
			co := findCompany(db, j.CompanyID)
			name := ""
			if co != nil {
				name = co.Name
			}
			if match(j.Title, j.Location, name) {
				jobs = append(jobs, map[string]any{
					"id": j.ID, "title": j.Title, "companyId": j.CompanyID, "location": j.Location,
					"remote": j.Remote, "postedAt": j.PostedAt, "company": co,
				})
			}
		}
		result["jobs"] = jobs
	}
	if tab == "all" || tab == "companies" {
		companies := []models.Company{}
		for i := range db.Companies {
			c := &db.Companies[i]
			if match(c.Name, c.Industry, c.Tagline) {
				companies = append(companies, *c)
			}
		}
		result["companies"] = companies
	}
	if tab == "all" || tab == "posts" {
		posts := []map[string]any{}
		for i := range db.Posts {
			p := &db.Posts[i]
			if match(p.Content) {
				author := service.FindUser(db, p.AuthorID)
				var ap models.UserPublic
				if author != nil {
					ap = service.ToPublicUser(author)
				}
				posts = append(posts, map[string]any{"id": p.ID, "content": p.Content, "author": ap})
			}
		}
		result["posts"] = posts
	}
	if tab == "all" || tab == "groups" {
		groups := []models.Group{}
		for i := range db.Groups {
			g := &db.Groups[i]
			if match(g.Name, g.Description) {
				groups = append(groups, *g)
			}
		}
		result["groups"] = groups
	}
	middleware.WriteJSON(w, http.StatusOK, result)
}

func findCompany(db *models.Database, id string) *models.Company {
	for i := range db.Companies {
		if db.Companies[i].ID == id {
			return &db.Companies[i]
		}
	}
	return nil
}
