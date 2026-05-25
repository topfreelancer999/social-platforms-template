package handlers

import (
	"encoding/json"
	"net/http"
	"sort"

	"github.com/go-chi/chi/v5"
	"github.com/linkedin-clone/api/internal/middleware"
	"github.com/linkedin-clone/api/internal/models"
	"github.com/linkedin-clone/api/internal/service"
	"github.com/linkedin-clone/api/internal/util"
)

func (api *API) ListThreads(w http.ResponseWriter, r *http.Request) {
	uid := middleware.UserID(r.Context())
	db, err := api.Store.GetDB(r.Context())
	if err != nil {
		middleware.WriteJSON(w, http.StatusInternalServerError, models.ErrorResponse{Message: err.Error()})
		return
	}
	type threadOut struct {
		models.Thread
		Participant models.UserPublic `json:"participant"`
		LastMessage *models.Message   `json:"lastMessage"`
		Unread      int               `json:"unread"`
	}
	out := []threadOut{}
	for i := range db.Threads {
		t := &db.Threads[i]
		if !util.Contains(t.ParticipantIDs, uid) {
			continue
		}
		otherID := ""
		for _, pid := range t.ParticipantIDs {
			if pid != uid {
				otherID = pid
				break
			}
		}
		other := service.FindUser(db, otherID)
		if other == nil {
			continue
		}
		var last *models.Message
		for j := range db.Messages {
			if db.Messages[j].ThreadID == t.ID {
				if last == nil || db.Messages[j].CreatedAt > last.CreatedAt {
					m := db.Messages[j]
					last = &m
				}
			}
		}
		unread := 0
		if t.UnreadBy != nil {
			unread = t.UnreadBy[uid]
		}
		out = append(out, threadOut{
			Thread: *t, Participant: service.ToPublicUser(other),
			LastMessage: last, Unread: unread,
		})
	}
	sort.Slice(out, func(i, j int) bool {
		return out[i].LastMessageAt > out[j].LastMessageAt
	})
	middleware.WriteJSON(w, http.StatusOK, out)
}

func (api *API) GetThread(w http.ResponseWriter, r *http.Request) {
	uid := middleware.UserID(r.Context())
	threadID := chi.URLParam(r, "id")
	db, err := api.Store.GetDB(r.Context())
	if err != nil {
		middleware.WriteJSON(w, http.StatusInternalServerError, models.ErrorResponse{Message: err.Error()})
		return
	}
	var thread *models.Thread
	for i := range db.Threads {
		if db.Threads[i].ID == threadID {
			thread = &db.Threads[i]
			break
		}
	}
	if thread == nil {
		middleware.WriteJSON(w, http.StatusNotFound, models.ErrorResponse{Message: "Not found"})
		return
	}
	_ = api.Store.Mutate(r.Context(), func(db *models.Database) error {
		for i := range db.Threads {
			if db.Threads[i].ID == threadID {
				if db.Threads[i].UnreadBy == nil {
					db.Threads[i].UnreadBy = map[string]int{}
				}
				db.Threads[i].UnreadBy[uid] = 0
				break
			}
		}
		for i := range db.Messages {
			if db.Messages[i].ThreadID == threadID && db.Messages[i].SenderID != uid {
				db.Messages[i].Read = true
			}
		}
		return nil
	})
	db, _ = api.Store.GetDB(r.Context())
	otherID := ""
	for _, pid := range thread.ParticipantIDs {
		if pid != uid {
			otherID = pid
			break
		}
	}
	other := service.FindUser(db, otherID)
	msgs := []map[string]any{}
	for i := range db.Messages {
		m := &db.Messages[i]
		if m.ThreadID != threadID {
			continue
		}
		sender := service.FindUser(db, m.SenderID)
		entry := map[string]any{
			"id": m.ID, "threadId": m.ThreadID, "senderId": m.SenderID,
			"content": m.Content, "createdAt": m.CreatedAt, "read": m.Read,
		}
		if sender != nil {
			entry["sender"] = service.ToPublicUser(sender)
		}
		msgs = append(msgs, entry)
	}
	participant := models.UserPublic{}
	if other != nil {
		participant = service.ToPublicUser(other)
	}
	middleware.WriteJSON(w, http.StatusOK, map[string]any{
		"thread": thread, "participant": participant, "messages": msgs,
	})
}

func (api *API) SendMessage(w http.ResponseWriter, r *http.Request) {
	uid := middleware.UserID(r.Context())
	threadID := chi.URLParam(r, "id")
	var body struct {
		Content string `json:"content"`
	}
	_ = json.NewDecoder(r.Body).Decode(&body)
	msg := models.Message{
		ID: util.GenerateID("m"), ThreadID: threadID, SenderID: uid,
		Content: body.Content, CreatedAt: util.NowISO(), Read: false,
	}
	_ = api.Store.Mutate(r.Context(), func(db *models.Database) error {
		db.Messages = append(db.Messages, msg)
		for i := range db.Threads {
			if db.Threads[i].ID != threadID {
				continue
			}
			db.Threads[i].LastMessageAt = msg.CreatedAt
			if db.Threads[i].UnreadBy == nil {
				db.Threads[i].UnreadBy = map[string]int{}
			}
			for _, pid := range db.Threads[i].ParticipantIDs {
				if pid != uid {
					db.Threads[i].UnreadBy[pid]++
				}
			}
			break
		}
		return nil
	})
	db, _ := api.Store.GetDB(r.Context())
	sender := service.FindUser(db, uid)
	out := map[string]any{
		"id": msg.ID, "threadId": msg.ThreadID, "senderId": msg.SenderID,
		"content": msg.Content, "createdAt": msg.CreatedAt, "read": msg.Read,
	}
	if sender != nil {
		out["sender"] = service.ToPublicUser(sender)
	}
	middleware.WriteJSON(w, http.StatusOK, out)
}

func (api *API) CreateThread(w http.ResponseWriter, r *http.Request) {
	uid := middleware.UserID(r.Context())
	var body struct {
		ToUserID string `json:"toUserId"`
		Content  string `json:"content"`
	}
	_ = json.NewDecoder(r.Body).Decode(&body)
	var threadID string
	_ = api.Store.Mutate(r.Context(), func(db *models.Database) error {
		for i := range db.Threads {
			t := &db.Threads[i]
			if util.Contains(t.ParticipantIDs, uid) && util.Contains(t.ParticipantIDs, body.ToUserID) {
				threadID = t.ID
				return nil
			}
		}
		threadID = util.GenerateID("t")
		db.Threads = append(db.Threads, models.Thread{
			ID: threadID, ParticipantIDs: []string{uid, body.ToUserID},
			LastMessageAt: util.NowISO(),
			UnreadBy:      map[string]int{uid: 0, body.ToUserID: 0},
		})
		return nil
	})
	msg := models.Message{
		ID: util.GenerateID("m"), ThreadID: threadID, SenderID: uid,
		Content: body.Content, CreatedAt: util.NowISO(), Read: false,
	}
	_ = api.Store.Mutate(r.Context(), func(db *models.Database) error {
		db.Messages = append(db.Messages, msg)
		for i := range db.Threads {
			if db.Threads[i].ID == threadID {
				db.Threads[i].LastMessageAt = msg.CreatedAt
				if db.Threads[i].UnreadBy == nil {
					db.Threads[i].UnreadBy = map[string]int{}
				}
				db.Threads[i].UnreadBy[body.ToUserID] = db.Threads[i].UnreadBy[body.ToUserID] + 1
				break
			}
		}
		return nil
	})
	middleware.WriteJSON(w, http.StatusOK, map[string]any{"threadId": threadID, "message": msg})
}
