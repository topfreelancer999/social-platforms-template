package middleware

import (
	"context"
	"encoding/json"
	"net/http"
	"strings"

	"github.com/linkedin-clone/api/internal/store"
)

type contextKey string

const UserIDKey contextKey = "userId"

func CORS(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PATCH, PUT, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Accept, Authorization, Content-Type")
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		next.ServeHTTP(w, r)
	})
}

func Auth(st *store.Store, optional bool) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			token := ""
			if h := r.Header.Get("Authorization"); strings.HasPrefix(h, "Bearer ") {
				token = strings.TrimPrefix(h, "Bearer ")
			}
			uid, ok := st.SessionUserID(r.Context(), token)
			if !ok && !optional {
				WriteJSON(w, http.StatusUnauthorized, map[string]string{"message": "Unauthorized"})
				return
			}
			ctx := context.WithValue(r.Context(), UserIDKey, uid)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

func UserID(ctx context.Context) string {
	uid, _ := ctx.Value(UserIDKey).(string)
	return uid
}

func WriteJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(v)
}
