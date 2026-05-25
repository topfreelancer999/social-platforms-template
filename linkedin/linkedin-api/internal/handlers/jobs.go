package handlers

import (
	"encoding/json"
	"net/http"
	"strings"

	"github.com/go-chi/chi/v5"
	"github.com/linkedin-clone/api/internal/middleware"
	"github.com/linkedin-clone/api/internal/models"
	"github.com/linkedin-clone/api/internal/util"
)

func (api *API) ListJobs(w http.ResponseWriter, r *http.Request) {
	q := strings.ToLower(r.URL.Query().Get("q"))
	remote := r.URL.Query().Get("remote") == "true"
	db, err := api.Store.GetDB(r.Context())
	if err != nil {
		middleware.WriteJSON(w, http.StatusInternalServerError, models.ErrorResponse{Message: err.Error()})
		return
	}
	out := []map[string]any{}
	for i := range db.Jobs {
		j := &db.Jobs[i]
		if remote && !j.Remote {
			continue
		}
		co := findCompany(db, j.CompanyID)
		name := ""
		if co != nil {
			name = co.Name
		}
		if q != "" && !strings.Contains(strings.ToLower(j.Title), q) &&
			!strings.Contains(strings.ToLower(j.Location), q) &&
			!strings.Contains(strings.ToLower(name), q) {
			continue
		}
		out = append(out, jobWithCompany(j, co))
	}
	middleware.WriteJSON(w, http.StatusOK, out)
}

func jobWithCompany(j *models.Job, co *models.Company) map[string]any {
	return map[string]any{
		"id": j.ID, "title": j.Title, "companyId": j.CompanyID, "location": j.Location,
		"remote": j.Remote, "experienceLevel": j.ExperienceLevel, "employmentType": j.EmploymentType,
		"description": j.Description, "qualifications": j.Qualifications, "salary": j.Salary,
		"applicants": j.Applicants, "postedAt": j.PostedAt, "promoted": j.Promoted, "company": co,
	}
}

func (api *API) GetJob(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	db, err := api.Store.GetDB(r.Context())
	if err != nil {
		middleware.WriteJSON(w, http.StatusInternalServerError, models.ErrorResponse{Message: err.Error()})
		return
	}
	for i := range db.Jobs {
		if db.Jobs[i].ID == id {
			co := findCompany(db, db.Jobs[i].CompanyID)
			middleware.WriteJSON(w, http.StatusOK, jobWithCompany(&db.Jobs[i], co))
			return
		}
	}
	middleware.WriteJSON(w, http.StatusNotFound, models.ErrorResponse{Message: "Not found"})
}

func (api *API) ApplyJob(w http.ResponseWriter, r *http.Request) {
	uid := middleware.UserID(r.Context())
	jobID := chi.URLParam(r, "id")
	var body struct {
		ResumeName string `json:"resumeName"`
	}
	_ = json.NewDecoder(r.Body).Decode(&body)
	if body.ResumeName == "" {
		body.ResumeName = "resume.pdf"
	}
	app := models.JobApplication{
		ID: util.GenerateID("ja"), JobID: jobID, UserID: uid,
		ResumeName: body.ResumeName, AppliedAt: util.NowISO(),
	}
	_ = api.Store.Mutate(r.Context(), func(db *models.Database) error {
		db.JobApplications = append(db.JobApplications, app)
		for i := range db.Jobs {
			if db.Jobs[i].ID == jobID {
				db.Jobs[i].Applicants++
				break
			}
		}
		return nil
	})
	middleware.WriteJSON(w, http.StatusOK, app)
}

func (api *API) SavedJobs(w http.ResponseWriter, r *http.Request) {
	uid := middleware.UserID(r.Context())
	db, err := api.Store.GetDB(r.Context())
	if err != nil {
		middleware.WriteJSON(w, http.StatusInternalServerError, models.ErrorResponse{Message: err.Error()})
		return
	}
	ids := db.SavedJobIds[uid]
	out := []map[string]any{}
	for _, id := range ids {
		for i := range db.Jobs {
			if db.Jobs[i].ID == id {
				co := findCompany(db, db.Jobs[i].CompanyID)
				out = append(out, jobWithCompany(&db.Jobs[i], co))
				break
			}
		}
	}
	middleware.WriteJSON(w, http.StatusOK, out)
}

func (api *API) SaveJob(w http.ResponseWriter, r *http.Request) {
	uid := middleware.UserID(r.Context())
	jobID := chi.URLParam(r, "id")
	_ = api.Store.Mutate(r.Context(), func(db *models.Database) error {
		if db.SavedJobIds == nil {
			db.SavedJobIds = map[string][]string{}
		}
		ids := db.SavedJobIds[uid]
		if util.Contains(ids, jobID) {
			db.SavedJobIds[uid] = util.RemoveString(ids, jobID)
		} else {
			db.SavedJobIds[uid] = append(ids, jobID)
		}
		return nil
	})
	middleware.WriteJSON(w, http.StatusOK, map[string]bool{"ok": true})
}

func (api *API) CreateJobAlert(w http.ResponseWriter, r *http.Request) {
	uid := middleware.UserID(r.Context())
	var body struct {
		Query    string `json:"query"`
		Location string `json:"location"`
	}
	_ = json.NewDecoder(r.Body).Decode(&body)
	alert := models.JobAlert{
		ID: util.GenerateID("alert"), UserID: uid, Query: body.Query,
		Location: body.Location, CreatedAt: util.NowISO(),
	}
	_ = api.Store.Mutate(r.Context(), func(db *models.Database) error {
		db.JobAlerts = append(db.JobAlerts, alert)
		return nil
	})
	middleware.WriteJSON(w, http.StatusOK, alert)
}
