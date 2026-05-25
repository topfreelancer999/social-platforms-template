package handlers

import (
	"encoding/json"
	"net/http"
	"strings"

	"github.com/linkedin-clone/api/internal/middleware"
	"github.com/linkedin-clone/api/internal/models"
	"github.com/linkedin-clone/api/internal/service"
	"github.com/linkedin-clone/api/internal/util"
)

func (api *API) Login(w http.ResponseWriter, r *http.Request) {
	var body struct {
		Email    string `json:"email"`
		Password string `json:"password"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		middleware.WriteJSON(w, http.StatusBadRequest, models.ErrorResponse{Message: "invalid body"})
		return
	}
	db, err := api.Store.GetDB(r.Context())
	if err != nil {
		middleware.WriteJSON(w, http.StatusInternalServerError, models.ErrorResponse{Message: err.Error()})
		return
	}
	var user *models.User
	for i := range db.Users {
		u := &db.Users[i]
		if strings.EqualFold(u.Email, body.Email) && u.Password == body.Password {
			user = u
			break
		}
	}
	if user == nil {
		middleware.WriteJSON(w, http.StatusUnauthorized, models.ErrorResponse{Message: "Invalid email or password"})
		return
	}
	token := util.GenerateID("tok")
	_ = api.Store.SetSession(r.Context(), token, user.ID)
	middleware.WriteJSON(w, http.StatusOK, models.AuthResponse{Token: token, User: service.ToPublicUser(user)})
}

func (api *API) Register(w http.ResponseWriter, r *http.Request) {
	var body struct {
		Email     string `json:"email"`
		Password  string `json:"password"`
		FirstName string `json:"firstName"`
		LastName  string `json:"lastName"`
		Headline  string `json:"headline"`
		Location  string `json:"location"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		middleware.WriteJSON(w, http.StatusBadRequest, models.ErrorResponse{Message: "invalid body"})
		return
	}
	var newUser models.User
	err := api.Store.Mutate(r.Context(), func(db *models.Database) error {
		for _, u := range db.Users {
			if strings.EqualFold(u.Email, body.Email) {
				return errEmailTaken
			}
		}
		id := util.GenerateID("u")
		username := strings.ToLower(body.FirstName + "-" + body.LastName)
		username = strings.ReplaceAll(username, " ", "-")
		newUser = models.User{
			ID: id, Email: body.Email, Password: body.Password,
			Username: username + "-" + id[len(id)-4:], FirstName: body.FirstName, LastName: body.LastName,
			Headline: body.Headline, Location: body.Location,
			AvatarURL: "https://i.pravatar.cc/150?u=" + id,
			CoverURL:  "https://picsum.photos/seed/" + id + "/1200/300",
			ConnectionIDs: []string{}, FollowerIDs: []string{}, FollowingIDs: []string{},
			Experience: []models.Experience{}, Education: []models.Education{}, Skills: []models.Skill{},
		}
		db.Users = append(db.Users, newUser)
		db.Settings = append(db.Settings, models.Settings{
			UserID: id, EmailNotifications: true, PushNotifications: true,
			ProfileVisibility: "public", ActivityVisibility: true, MessagingFrom: "connections",
			Language: "en", Theme: "light",
		})
		return nil
	})
	if err == errEmailTaken {
		middleware.WriteJSON(w, http.StatusBadRequest, models.ErrorResponse{Message: "Email already registered"})
		return
	}
	if err != nil {
		middleware.WriteJSON(w, http.StatusInternalServerError, models.ErrorResponse{Message: err.Error()})
		return
	}
	token := util.GenerateID("tok")
	_ = api.Store.SetSession(r.Context(), token, newUser.ID)
	middleware.WriteJSON(w, http.StatusOK, models.AuthResponse{Token: token, User: service.ToPublicUser(&newUser)})
}

var errEmailTaken = &emailTakenError{}

type emailTakenError struct{}

func (e *emailTakenError) Error() string { return "email taken" }

func (api *API) ForgotPassword(w http.ResponseWriter, r *http.Request) {
	middleware.WriteJSON(w, http.StatusOK, map[string]string{"message": "Reset link sent (mock)"})
}

func (api *API) Me(w http.ResponseWriter, r *http.Request) {
	uid := middleware.UserID(r.Context())
	if uid == "" {
		token := ""
		if h := r.Header.Get("Authorization"); strings.HasPrefix(h, "Bearer ") {
			token = strings.TrimPrefix(h, "Bearer ")
		}
		var ok bool
		uid, ok = api.Store.SessionUserID(r.Context(), token)
		if !ok {
			middleware.WriteJSON(w, http.StatusUnauthorized, models.ErrorResponse{Message: "Unauthorized"})
			return
		}
	}
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
	middleware.WriteJSON(w, http.StatusOK, service.ToPublicUser(u))
}
