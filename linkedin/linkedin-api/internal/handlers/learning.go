package handlers

import (
	"encoding/json"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/linkedin-clone/api/internal/middleware"
	"github.com/linkedin-clone/api/internal/models"
)

func (api *API) ListCourses(w http.ResponseWriter, r *http.Request) {
	db, err := api.Store.GetDB(r.Context())
	if err != nil {
		middleware.WriteJSON(w, http.StatusInternalServerError, models.ErrorResponse{Message: err.Error()})
		return
	}
	middleware.WriteJSON(w, http.StatusOK, db.Courses)
}

func (api *API) GetCourse(w http.ResponseWriter, r *http.Request) {
	uid := middleware.UserID(r.Context())
	id := chi.URLParam(r, "id")
	db, err := api.Store.GetDB(r.Context())
	if err != nil {
		middleware.WriteJSON(w, http.StatusInternalServerError, models.ErrorResponse{Message: err.Error()})
		return
	}
	var course *models.Course
	for i := range db.Courses {
		if db.Courses[i].ID == id {
			course = &db.Courses[i]
			break
		}
	}
	if course == nil {
		middleware.WriteJSON(w, http.StatusNotFound, models.ErrorResponse{Message: "Not found"})
		return
	}
	var progress *models.CourseProgress
	for i := range db.CourseProgress {
		if db.CourseProgress[i].CourseID == id && db.CourseProgress[i].UserID == uid {
			progress = &db.CourseProgress[i]
			break
		}
	}
	middleware.WriteJSON(w, http.StatusOK, map[string]any{"course": course, "progress": progress})
}

func (api *API) CourseProgress(w http.ResponseWriter, r *http.Request) {
	uid := middleware.UserID(r.Context())
	courseID := chi.URLParam(r, "id")
	var body struct {
		LessonID string `json:"lessonId"`
	}
	_ = json.NewDecoder(r.Body).Decode(&body)
	var result *models.CourseProgress
	_ = api.Store.Mutate(r.Context(), func(db *models.Database) error {
		var course *models.Course
		for i := range db.Courses {
			if db.Courses[i].ID == courseID {
				course = &db.Courses[i]
				break
			}
		}
		if course == nil {
			return nil
		}
		idx := -1
		for i := range db.CourseProgress {
			if db.CourseProgress[i].CourseID == courseID && db.CourseProgress[i].UserID == uid {
				idx = i
				break
			}
		}
		if idx < 0 {
			db.CourseProgress = append(db.CourseProgress, models.CourseProgress{
				CourseID: courseID, UserID: uid, CompletedLessonIDs: []string{}, Percent: 0,
			})
			idx = len(db.CourseProgress) - 1
		}
		p := &db.CourseProgress[idx]
		if body.LessonID != "" {
			found := false
			for _, lid := range p.CompletedLessonIDs {
				if lid == body.LessonID {
					found = true
					break
				}
			}
			if !found {
				p.CompletedLessonIDs = append(p.CompletedLessonIDs, body.LessonID)
			}
		}
		total := len(course.Lessons)
		if total > 0 {
			p.Percent = len(p.CompletedLessonIDs) * 100 / total
		}
		result = p
		return nil
	})
	middleware.WriteJSON(w, http.StatusOK, result)
}
