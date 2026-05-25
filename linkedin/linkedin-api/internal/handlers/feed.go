package handlers

import (
	"encoding/json"
	"net/http"
	"sort"
	"strconv"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/linkedin-clone/api/internal/middleware"
	"github.com/linkedin-clone/api/internal/models"
	"github.com/linkedin-clone/api/internal/service"
	"github.com/linkedin-clone/api/internal/util"
)

func (api *API) Feed(w http.ResponseWriter, r *http.Request) {
	uid := middleware.UserID(r.Context())
	page, _ := strconv.Atoi(r.URL.Query().Get("page"))
	if page < 1 {
		page = 1
	}
	filter := r.URL.Query().Get("filter")
	if filter == "" {
		filter = "recent"
	}
	db, err := api.Store.GetDB(r.Context())
	if err != nil {
		middleware.WriteJSON(w, http.StatusInternalServerError, models.ErrorResponse{Message: err.Error()})
		return
	}
	posts := make([]models.Post, len(db.Posts))
	copy(posts, db.Posts)
	sort.Slice(posts, func(i, j int) bool {
		ti, _ := time.Parse(time.RFC3339, posts[i].CreatedAt)
		tj, _ := time.Parse(time.RFC3339, posts[j].CreatedAt)
		return ti.After(tj)
	})
	if uid != "" && filter == "network" {
		u := service.FindUser(db, uid)
		if u != nil {
			net := map[string]bool{uid: true}
			for _, id := range u.ConnectionIDs {
				net[id] = true
			}
			for _, id := range u.FollowingIDs {
				net[id] = true
			}
			filtered := posts[:0]
			for _, p := range posts {
				if net[p.AuthorID] {
					filtered = append(filtered, p)
				}
			}
			posts = filtered
		}
	} else if uid != "" && filter == "following" {
		u := service.FindUser(db, uid)
		if u != nil {
			following := map[string]bool{}
			for _, id := range u.FollowingIDs {
				following[id] = true
			}
			filtered := posts[:0]
			for _, p := range posts {
				if following[p.AuthorID] {
					filtered = append(filtered, p)
				}
			}
			posts = filtered
		}
	}
	start := (page - 1) * util.PageSize
	end := start + util.PageSize
	if start > len(posts) {
		start = len(posts)
	}
	if end > len(posts) {
		end = len(posts)
	}
	slice := posts[start:end]
	items := make([]models.EnrichedPost, 0, len(slice))
	for i := range slice {
		items = append(items, service.EnrichPost(db, &slice[i]))
	}
	middleware.WriteJSON(w, http.StatusOK, models.PaginatedFeed{
		Items: items, Page: page, Total: len(posts), HasMore: end < len(posts),
	})
}

func (api *API) CreatePost(w http.ResponseWriter, r *http.Request) {
	uid := middleware.UserID(r.Context())
	var body models.Post
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		middleware.WriteJSON(w, http.StatusBadRequest, models.ErrorResponse{Message: "invalid body"})
		return
	}
	var post models.Post
	err := api.Store.Mutate(r.Context(), func(db *models.Database) error {
		post = models.Post{
			ID: util.GenerateID("p"), AuthorID: uid, Content: body.Content,
			ImageURL: body.ImageURL, ArticleURL: body.ArticleURL, ArticleTitle: body.ArticleTitle,
			Visibility: body.Visibility, CreatedAt: util.NowISO(),
			Reactions: []models.PostReaction{}, CommentIDs: []string{},
			CompanyID: body.CompanyID, GroupID: body.GroupID,
		}
		if post.Visibility == "" {
			post.Visibility = "anyone"
		}
		db.Posts = append([]models.Post{post}, db.Posts...)
		return nil
	})
	if err != nil {
		middleware.WriteJSON(w, http.StatusInternalServerError, models.ErrorResponse{Message: err.Error()})
		return
	}
	db, _ := api.Store.GetDB(r.Context())
	middleware.WriteJSON(w, http.StatusOK, service.EnrichPost(db, &post))
}

func (api *API) ReactPost(w http.ResponseWriter, r *http.Request) {
	uid := middleware.UserID(r.Context())
	postID := chi.URLParam(r, "id")
	var body struct {
		Type string `json:"type"`
	}
	_ = json.NewDecoder(r.Body).Decode(&body)
	err := api.Store.Mutate(r.Context(), func(db *models.Database) error {
		for i := range db.Posts {
			if db.Posts[i].ID != postID {
				continue
			}
			p := &db.Posts[i]
			idx := -1
			for j, react := range p.Reactions {
				if react.UserID == uid {
					idx = j
					break
				}
			}
			if idx >= 0 {
				if p.Reactions[idx].Type == body.Type {
					p.Reactions = append(p.Reactions[:idx], p.Reactions[idx+1:]...)
				} else {
					p.Reactions[idx].Type = body.Type
				}
			} else {
				p.Reactions = append(p.Reactions, models.PostReaction{UserID: uid, Type: body.Type})
			}
			return nil
		}
		return nil
	})
	if err != nil {
		middleware.WriteJSON(w, http.StatusInternalServerError, models.ErrorResponse{Message: err.Error()})
		return
	}
	db, _ := api.Store.GetDB(r.Context())
	for i := range db.Posts {
		if db.Posts[i].ID == postID {
			middleware.WriteJSON(w, http.StatusOK, service.EnrichPost(db, &db.Posts[i]))
			return
		}
	}
	middleware.WriteJSON(w, http.StatusNotFound, models.ErrorResponse{Message: "Not found"})
}

func (api *API) CommentPost(w http.ResponseWriter, r *http.Request) {
	uid := middleware.UserID(r.Context())
	postID := chi.URLParam(r, "id")
	var body struct {
		Content string `json:"content"`
	}
	_ = json.NewDecoder(r.Body).Decode(&body)
	var comment models.Comment
	err := api.Store.Mutate(r.Context(), func(db *models.Database) error {
		comment = models.Comment{
			ID: util.GenerateID("cm"), PostID: postID, AuthorID: uid,
			Content: body.Content, CreatedAt: util.NowISO(),
		}
		db.Comments = append(db.Comments, comment)
		for i := range db.Posts {
			if db.Posts[i].ID == postID {
				db.Posts[i].CommentIDs = append(db.Posts[i].CommentIDs, comment.ID)
				break
			}
		}
		return nil
	})
	if err != nil {
		middleware.WriteJSON(w, http.StatusInternalServerError, models.ErrorResponse{Message: err.Error()})
		return
	}
	db, _ := api.Store.GetDB(r.Context())
	u := service.FindUser(db, uid)
	ec := models.EnrichedComment{Comment: comment}
	if u != nil {
		ec.Author = service.ToPublicUser(u)
	}
	middleware.WriteJSON(w, http.StatusOK, ec)
}

func (api *API) Repost(w http.ResponseWriter, r *http.Request) {
	uid := middleware.UserID(r.Context())
	origID := chi.URLParam(r, "id")
	var post models.Post
	err := api.Store.Mutate(r.Context(), func(db *models.Database) error {
		post = models.Post{
			ID: util.GenerateID("p"), AuthorID: uid, Content: "",
			Visibility: "anyone", CreatedAt: util.NowISO(),
			Reactions: []models.PostReaction{}, CommentIDs: []string{}, RepostOfID: origID,
		}
		db.Posts = append([]models.Post{post}, db.Posts...)
		return nil
	})
	if err != nil {
		middleware.WriteJSON(w, http.StatusInternalServerError, models.ErrorResponse{Message: err.Error()})
		return
	}
	db, _ := api.Store.GetDB(r.Context())
	middleware.WriteJSON(w, http.StatusOK, service.EnrichPost(db, &post))
}
