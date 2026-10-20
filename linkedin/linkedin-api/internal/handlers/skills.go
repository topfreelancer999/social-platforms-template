package handlers

import (
	"encoding/json"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/linkedin-clone/api/internal/middleware"
	"github.com/linkedin-clone/api/internal/models"
	"github.com/linkedin-clone/api/internal/service"
)

// writeSkillError maps service.SkillError to its status; anything else is a 500.
func writeSkillError(w http.ResponseWriter, err error) {
	if se, ok := service.AsSkillError(err); ok {
		middleware.WriteJSON(w, se.Status, models.ErrorResponse{Message: se.Message})
		return
	}
	middleware.WriteJSON(w, http.StatusInternalServerError, models.ErrorResponse{Message: err.Error()})
}

func (api *API) ListSkills(w http.ResponseWriter, r *http.Request) {
	uid := middleware.UserID(r.Context())
	db, err := api.Store.GetDB(r.Context())
	if err != nil {
		writeSkillError(w, err)
		return
	}
	owner, err := service.ResolveSkillOwner(db, chi.URLParam(r, "id"), uid)
	if err != nil {
		writeSkillError(w, err)
		return
	}
	middleware.WriteJSON(w, http.StatusOK, service.BuildSkills(db, owner, uid))
}

func (api *API) AddSkill(w http.ResponseWriter, r *http.Request) {
	uid := middleware.UserID(r.Context())
	var body struct {
		Name string `json:"name"`
	}
	// A malformed body falls through as an empty name and fails validation.
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		body.Name = ""
	}
	var view service.SkillView
	err := api.Store.Mutate(r.Context(), func(db *models.Database) error {
		owner, skill, err := service.AddSkill(db, chi.URLParam(r, "id"), uid, body.Name)
		if err != nil {
			return err
		}
		view = service.BuildSkillView(db, owner, skill, uid)
		return nil
	})
	if err != nil {
		writeSkillError(w, err)
		return
	}
	middleware.WriteJSON(w, http.StatusCreated, view)
}

func (api *API) UpdateSkill(w http.ResponseWriter, r *http.Request) {
	uid := middleware.UserID(r.Context())
	var body struct {
		Pinned *bool `json:"pinned"`
	}
	// The decoder may allocate Pinned before failing on a non-boolean; treat that as missing.
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		body.Pinned = nil
	}
	var view service.SkillView
	err := api.Store.Mutate(r.Context(), func(db *models.Database) error {
		owner, skill, err := service.SetSkillPinned(db, chi.URLParam(r, "id"), uid, chi.URLParam(r, "skillId"), body.Pinned)
		if err != nil {
			return err
		}
		view = service.BuildSkillView(db, owner, skill, uid)
		return nil
	})
	if err != nil {
		writeSkillError(w, err)
		return
	}
	middleware.WriteJSON(w, http.StatusOK, view)
}

func (api *API) DeleteSkill(w http.ResponseWriter, r *http.Request) {
	uid := middleware.UserID(r.Context())
	err := api.Store.Mutate(r.Context(), func(db *models.Database) error {
		return service.RemoveSkill(db, chi.URLParam(r, "id"), uid, chi.URLParam(r, "skillId"))
	})
	if err != nil {
		writeSkillError(w, err)
		return
	}
	middleware.WriteJSON(w, http.StatusOK, map[string]bool{"ok": true})
}

func (api *API) ListSkillEndorsers(w http.ResponseWriter, r *http.Request) {
	uid := middleware.UserID(r.Context())
	db, err := api.Store.GetDB(r.Context())
	if err != nil {
		writeSkillError(w, err)
		return
	}
	res, err := service.BuildEndorsers(db, chi.URLParam(r, "id"), uid, chi.URLParam(r, "skillId"))
	if err != nil {
		writeSkillError(w, err)
		return
	}
	middleware.WriteJSON(w, http.StatusOK, res)
}

// endorsement runs Endorse or Unendorse and answers with the updated skill view.
func (api *API) endorsement(w http.ResponseWriter, r *http.Request,
	fn func(*models.Database, string, string, string) (*models.User, *models.Skill, error)) {
	uid := middleware.UserID(r.Context())
	var view service.SkillView
	err := api.Store.Mutate(r.Context(), func(db *models.Database) error {
		owner, skill, err := fn(db, chi.URLParam(r, "id"), uid, chi.URLParam(r, "skillId"))
		if err != nil {
			return err
		}
		view = service.BuildSkillView(db, owner, skill, uid)
		return nil
	})
	if err != nil {
		writeSkillError(w, err)
		return
	}
	middleware.WriteJSON(w, http.StatusOK, view)
}

func (api *API) EndorseSkill(w http.ResponseWriter, r *http.Request) {
	api.endorsement(w, r, service.Endorse)
}

func (api *API) UnendorseSkill(w http.ResponseWriter, r *http.Request) {
	api.endorsement(w, r, service.Unendorse)
}
