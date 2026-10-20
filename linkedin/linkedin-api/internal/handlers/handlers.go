package handlers

import (
	"net/http"

	"github.com/go-chi/chi/v5"
	chimw "github.com/go-chi/chi/v5/middleware"
	"github.com/linkedin-clone/api/internal/middleware"
	"github.com/linkedin-clone/api/internal/store"
)

type API struct {
	Store *store.Store
}

func NewRouter(st *store.Store) http.Handler {
	api := &API{Store: st}
	r := chi.NewRouter()
	r.Use(chimw.Logger)
	r.Use(chimw.Recoverer)
	r.Use(middleware.CORS)

	r.Get("/health", api.Health)
	r.Post("/admin/reset", api.ResetDB)

	r.Route("/api", func(r chi.Router) {
		r.Post("/auth/login", api.Login)
		r.Post("/auth/register", api.Register)
		r.Post("/auth/forgot-password", api.ForgotPassword)

		r.Get("/courses", api.ListCourses)
		r.Get("/groups", api.ListGroups)

		r.Group(func(r chi.Router) {
			r.Use(middleware.Auth(st, true))
			r.Get("/auth/me", api.Me)
		})

		r.Group(func(r chi.Router) {
			r.Use(middleware.Auth(st, false))

			r.Get("/feed", api.Feed)
			r.Post("/posts", api.CreatePost)
			r.Post("/posts/{id}/react", api.ReactPost)
			r.Post("/posts/{id}/comments", api.CommentPost)
			r.Post("/posts/{id}/repost", api.Repost)

			r.Get("/users/{id}", api.GetUser)
			r.Patch("/users/me", api.PatchMe)
			r.Post("/users/{id}/connect", api.Connect)
			r.Post("/users/{id}/follow", api.Follow)

			r.Get("/users/{id}/skills", api.ListSkills)
			r.Post("/users/{id}/skills", api.AddSkill)
			r.Patch("/users/{id}/skills/{skillId}", api.UpdateSkill)
			r.Delete("/users/{id}/skills/{skillId}", api.DeleteSkill)
			r.Get("/users/{id}/skills/{skillId}/endorsers", api.ListSkillEndorsers)
			r.Post("/users/{id}/skills/{skillId}/endorse", api.EndorseSkill)
			r.Delete("/users/{id}/skills/{skillId}/endorse", api.UnendorseSkill)

			r.Get("/network", api.Network)
			r.Post("/invitations/{id}/accept", api.AcceptInvitation)
			r.Post("/invitations/{id}/ignore", api.IgnoreInvitation)

			r.Get("/search", api.Search)

			r.Get("/jobs", api.ListJobs)
			r.Get("/jobs/saved", api.SavedJobs)
			r.Post("/job-alerts", api.CreateJobAlert)
			r.Get("/jobs/{id}", api.GetJob)
			r.Post("/jobs/{id}/apply", api.ApplyJob)
			r.Post("/jobs/{id}/save", api.SaveJob)

			r.Get("/messages/threads", api.ListThreads)
			r.Post("/messages/threads", api.CreateThread)
			r.Get("/messages/threads/{id}", api.GetThread)
			r.Post("/messages/threads/{id}", api.SendMessage)

			r.Get("/notifications", api.ListNotifications)
			r.Post("/notifications/read-all", api.ReadAllNotifications)
			r.Post("/notifications/{id}/read", api.ReadNotification)

			r.Get("/companies/{slug}", api.GetCompany)
			r.Post("/companies/{id}/follow", api.FollowCompany)

			r.Get("/groups/{id}", api.GetGroup)
			r.Post("/groups/{id}/join", api.JoinGroup)
			r.Post("/groups/{id}/leave", api.LeaveGroup)

			r.Get("/courses/{id}", api.GetCourse)
			r.Post("/courses/{id}/progress", api.CourseProgress)

			r.Get("/settings", api.GetSettings)
			r.Patch("/settings", api.PatchSettings)
			r.Get("/events", api.ListEvents)
			r.Post("/events/{id}/rsvp", api.RSVPEvent)
		})
	})

	return r
}

func (api *API) Health(w http.ResponseWriter, r *http.Request) {
	middleware.WriteJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

func (api *API) ResetDB(w http.ResponseWriter, r *http.Request) {
	if err := api.Store.Reset(r.Context()); err != nil {
		middleware.WriteJSON(w, http.StatusInternalServerError, map[string]string{"message": err.Error()})
		return
	}
	middleware.WriteJSON(w, http.StatusOK, map[string]string{"message": "database reset"})
}
