package handlers

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/linkedin-clone/api/internal/service"
	"github.com/linkedin-clone/api/internal/store"
)

// testServer runs the real router on the in-memory store (no Redis needed), seeded from seed.json.
type testServer struct {
	t      *testing.T
	router http.Handler
}

func newTestServer(t *testing.T) *testServer {
	t.Helper()
	st := store.New(nil)
	if err := st.Init(context.Background()); err != nil {
		t.Fatalf("init store: %v", err)
	}
	return &testServer{t: t, router: NewRouter(st)}
}

func (s *testServer) do(method, path, token string, body any) *httptest.ResponseRecorder {
	s.t.Helper()
	var buf bytes.Buffer
	if body != nil {
		if err := json.NewEncoder(&buf).Encode(body); err != nil {
			s.t.Fatal(err)
		}
	}
	req := httptest.NewRequest(method, path, &buf)
	req.Header.Set("Content-Type", "application/json")
	if token != "" {
		req.Header.Set("Authorization", "Bearer "+token)
	}
	rec := httptest.NewRecorder()
	s.router.ServeHTTP(rec, req)
	return rec
}

func (s *testServer) login(email string) string {
	s.t.Helper()
	rec := s.do(http.MethodPost, "/api/auth/login", "", map[string]string{"email": email, "password": "password"})
	if rec.Code != http.StatusOK {
		s.t.Fatalf("login %s: %d %s", email, rec.Code, rec.Body)
	}
	var res struct{ Token string }
	decode(s.t, rec, &res)
	return res.Token
}

func decode(t *testing.T, rec *httptest.ResponseRecorder, v any) {
	t.Helper()
	if err := json.Unmarshal(rec.Body.Bytes(), v); err != nil {
		t.Fatalf("decode %q: %v", rec.Body.String(), err)
	}
}

func expectStatus(t *testing.T, rec *httptest.ResponseRecorder, want int) {
	t.Helper()
	if rec.Code != want {
		t.Fatalf("status = %d, want %d (body %s)", rec.Code, want, rec.Body)
	}
	if want >= 400 {
		var e struct{ Message string }
		decode(t, rec, &e)
		if e.Message == "" {
			t.Fatalf("error response without message: %s", rec.Body)
		}
	}
}

func findView(t *testing.T, res service.SkillsResponse, name string) service.SkillView {
	t.Helper()
	for _, s := range res.Skills {
		if s.Name == name {
			return s
		}
	}
	t.Fatalf("skill %q not found", name)
	return service.SkillView{}
}

const (
	demoEmail = "demo@linkedin.local"  // Jane Doe (u1), connected to u2–u5
	johnEmail = "john.smith@email.com" // John Smith (u2)
)

func TestListSkillsOwnProfile(t *testing.T) {
	s := newTestServer(t)
	token := s.login(demoEmail)
	rec := s.do(http.MethodGet, "/api/users/jane-doe/skills", token, nil)
	expectStatus(t, rec, http.StatusOK)
	var res service.SkillsResponse
	decode(t, rec, &res)
	if !res.IsOwner || res.CanEndorse {
		t.Fatalf("isOwner=%v canEndorse=%v, want true/false", res.IsOwner, res.CanEndorse)
	}
	first := res.Skills[0]
	if first.Name != "Product Strategy" || !first.Pinned || first.Endorsements != 4 || len(first.Endorsers) != 3 {
		t.Fatalf("unexpected first skill: %+v", first)
	}
	// John (u2) works at TechCorp like Jane.
	if h := first.ColleagueHighlight; h == nil || h.Company != "TechCorp" || h.Count != 1 {
		t.Fatalf("colleague highlight = %+v", first.ColleagueHighlight)
	}
	if sql := findView(t, res, "SQL"); sql.Endorsements != 0 || len(sql.Endorsers) != 0 {
		t.Fatalf("SQL should have no endorsements: %+v", sql)
	}
}

func TestListSkillsRequiresAuth(t *testing.T) {
	s := newTestServer(t)
	expectStatus(t, s.do(http.MethodGet, "/api/users/jane-doe/skills", "", nil), http.StatusUnauthorized)
	expectStatus(t, s.do(http.MethodPost, "/api/users/john-smith/skills/s4/endorse", "", nil), http.StatusUnauthorized)
}

func TestEndorseAndWithdraw(t *testing.T) {
	s := newTestServer(t)
	jane := s.login(demoEmail)

	var res service.SkillsResponse
	decode(t, s.do(http.MethodGet, "/api/users/john-smith/skills", jane, nil), &res)
	if !res.CanEndorse || res.IsOwner {
		t.Fatalf("Jane should be able to endorse John: %+v", res)
	}
	if !findView(t, res, "TypeScript").EndorsedByMe || findView(t, res, "React").EndorsedByMe {
		t.Fatal("seed: Jane endorsed TypeScript but not React")
	}

	rec := s.do(http.MethodPost, "/api/users/john-smith/skills/s4/endorse", jane, nil)
	expectStatus(t, rec, http.StatusOK)
	var view service.SkillView
	decode(t, rec, &view)
	if !view.EndorsedByMe || view.Endorsements != 3 || view.Endorsers[0].ID != "u1" {
		t.Fatalf("after endorse: %+v", view)
	}
	expectStatus(t, s.do(http.MethodPost, "/api/users/john-smith/skills/s4/endorse", jane, nil), http.StatusConflict)

	// John is notified exactly once.
	john := s.login(johnEmail)
	countEndorseNotifications := func() int {
		var n struct {
			Items []struct{ Type, Title string }
		}
		decode(t, s.do(http.MethodGet, "/api/notifications", john, nil), &n)
		count := 0
		for _, item := range n.Items {
			if item.Type == "skill_endorsement" && item.Title == "Jane Doe endorsed you for React" {
				count++
			}
		}
		return count
	}
	if got := countEndorseNotifications(); got != 1 {
		t.Fatalf("endorse notifications = %d, want 1", got)
	}

	rec = s.do(http.MethodDelete, "/api/users/john-smith/skills/s4/endorse", jane, nil)
	expectStatus(t, rec, http.StatusOK)
	decode(t, rec, &view)
	if view.EndorsedByMe || view.Endorsements != 2 {
		t.Fatalf("after withdraw: %+v", view)
	}
	if got := countEndorseNotifications(); got != 0 {
		t.Fatalf("notification should be removed with the endorsement, got %d", got)
	}
	expectStatus(t, s.do(http.MethodDelete, "/api/users/john-smith/skills/s4/endorse", jane, nil), http.StatusConflict)
}

func TestEndorseRules(t *testing.T) {
	s := newTestServer(t)
	jane := s.login(demoEmail)
	cases := []struct {
		name, path string
		want       int
	}{
		{"own skill", "/api/users/jane-doe/skills/s1/endorse", http.StatusBadRequest},
		{"own skill via me", "/api/users/me/skills/s1/endorse", http.StatusBadRequest},
		{"non-connection (3rd)", "/api/users/david-lee/skills/s20/endorse", http.StatusForbidden},
		{"2nd-degree connection", "/api/users/alex-brown/skills/s10/endorse", http.StatusForbidden},
		{"unknown skill", "/api/users/john-smith/skills/nope/endorse", http.StatusNotFound},
		{"unknown user", "/api/users/nobody/skills/s4/endorse", http.StatusNotFound},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			expectStatus(t, s.do(http.MethodPost, tc.path, jane, nil), tc.want)
		})
	}

	var res service.SkillsResponse
	decode(t, s.do(http.MethodGet, "/api/users/david-lee/skills", jane, nil), &res)
	if res.CanEndorse || len(res.Skills) == 0 {
		t.Fatalf("non-connection should list skills without endorse: %+v", res)
	}
}

func TestAddSkillValidation(t *testing.T) {
	s := newTestServer(t)
	jane := s.login(demoEmail)

	rec := s.do(http.MethodPost, "/api/users/me/skills", jane, map[string]string{"name": "  Go   (Programming Language) "})
	expectStatus(t, rec, http.StatusCreated)
	var view service.SkillView
	decode(t, rec, &view)
	if view.Name != "Go (Programming Language)" || view.Endorsements != 0 || view.Endorsers == nil {
		t.Fatalf("created skill: %+v", view)
	}

	cases := []struct {
		name string
		path string
		body any
		want int
	}{
		{"duplicate (case-insensitive)", "/api/users/jane-doe/skills", map[string]string{"name": "product STRATEGY"}, http.StatusConflict},
		{"empty", "/api/users/jane-doe/skills", map[string]string{"name": "   "}, http.StatusBadRequest},
		{"missing", "/api/users/jane-doe/skills", map[string]int{"name": 3}, http.StatusBadRequest},
		{"too long", "/api/users/jane-doe/skills", map[string]string{"name": strings.Repeat("x", service.MaxSkillNameLength+1)}, http.StatusBadRequest},
		{"someone else's profile", "/api/users/john-smith/skills", map[string]string{"name": "Rust"}, http.StatusForbidden},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			expectStatus(t, s.do(http.MethodPost, tc.path, jane, tc.body), tc.want)
		})
	}

	var res service.SkillsResponse
	decode(t, s.do(http.MethodGet, "/api/users/jane-doe/skills", jane, nil), &res)
	for i := len(res.Skills); i < service.MaxSkills; i++ {
		expectStatus(t, s.do(http.MethodPost, "/api/users/me/skills", jane, map[string]string{"name": fmt.Sprintf("Skill %d", i)}), http.StatusCreated)
	}
	expectStatus(t, s.do(http.MethodPost, "/api/users/me/skills", jane, map[string]string{"name": "One too many"}), http.StatusBadRequest)
}

func TestPinAndRemoveSkill(t *testing.T) {
	s := newTestServer(t)
	jane := s.login(demoEmail)

	// Jane has two pinned skills in the seed; a third is allowed, a fourth is not.
	expectStatus(t, s.do(http.MethodPatch, "/api/users/me/skills/s2", jane, map[string]bool{"pinned": true}), http.StatusOK)
	expectStatus(t, s.do(http.MethodPatch, "/api/users/me/skills/s13", jane, map[string]bool{"pinned": true}), http.StatusBadRequest)
	expectStatus(t, s.do(http.MethodPatch, "/api/users/me/skills/s13", jane, map[string]string{"pinned": "yes"}), http.StatusBadRequest)
	expectStatus(t, s.do(http.MethodPatch, "/api/users/john-smith/skills/s4", jane, map[string]bool{"pinned": true}), http.StatusForbidden)

	var res service.SkillsResponse
	decode(t, s.do(http.MethodGet, "/api/users/jane-doe/skills", jane, nil), &res)
	for i, sk := range res.Skills {
		if sk.Pinned != (i < 3) {
			t.Fatalf("pinned skills should be listed first: %+v", res.Skills)
		}
	}

	expectStatus(t, s.do(http.MethodDelete, "/api/users/john-smith/skills/s4", jane, nil), http.StatusForbidden)
	expectStatus(t, s.do(http.MethodDelete, "/api/users/me/skills/s13", jane, nil), http.StatusOK)
	expectStatus(t, s.do(http.MethodDelete, "/api/users/me/skills/s13", jane, nil), http.StatusNotFound)
}

func TestListEndorsers(t *testing.T) {
	s := newTestServer(t)
	jane := s.login(demoEmail)

	var res service.SkillEndorsersResponse
	rec := s.do(http.MethodGet, "/api/users/jane-doe/skills/s1/endorsers", jane, nil)
	expectStatus(t, rec, http.StatusOK)
	decode(t, rec, &res)
	// Seeded as [u3 u5 u4 u2]: most recent first.
	if res.Skill.Name != "Product Strategy" || len(res.Items) != 4 || res.Items[0].ID != "u2" || res.Items[3].ID != "u3" {
		t.Fatalf("endorsers: %+v", res)
	}

	// The viewer is listed first when they endorsed the skill (seeded as [u4 u2 u1]).
	decode(t, s.do(http.MethodGet, "/api/users/sarah-chen/skills/s6/endorsers", jane, nil), &res)
	if res.Items[0].ID != "u1" || res.Items[1].ID != "u2" {
		t.Fatalf("viewer should be first: %+v", res.Items)
	}
}

func TestPatchMeIgnoresSkills(t *testing.T) {
	s := newTestServer(t)
	jane := s.login(demoEmail)
	body := map[string]any{"headline": "Updated", "skills": []map[string]any{{"id": "x", "name": "Forged", "endorsements": 999}}}
	expectStatus(t, s.do(http.MethodPatch, "/api/users/me", jane, body), http.StatusOK)

	var res service.SkillsResponse
	decode(t, s.do(http.MethodGet, "/api/users/me/skills", jane, nil), &res)
	for _, sk := range res.Skills {
		if sk.Name == "Forged" {
			t.Fatal("PATCH /users/me must not overwrite skills")
		}
	}
}
