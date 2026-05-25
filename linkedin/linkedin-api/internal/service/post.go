package service

import "github.com/linkedin-clone/api/internal/models"

func EnrichPost(db *models.Database, post *models.Post) models.EnrichedPost {
	var author *models.UserPublic
	if u := FindUser(db, post.AuthorID); u != nil {
		p := ToPublicUser(u)
		author = &p
	}
	comments := make([]models.EnrichedComment, 0)
	for _, c := range db.Comments {
		if !containsStr(post.CommentIDs, c.ID) {
			continue
		}
		ec := models.EnrichedComment{Comment: c}
		if u := FindUser(db, c.AuthorID); u != nil {
			ec.Author = ToPublicUser(u)
		}
		comments = append(comments, ec)
	}
	summary := map[string]int{}
	for _, r := range post.Reactions {
		summary[r.Type]++
	}
	ep := models.EnrichedPost{
		Post:            *post,
		Author:          author,
		Comments:        comments,
		ReactionSummary: summary,
		TotalReactions:  len(post.Reactions),
	}
	if post.RepostOfID != "" {
		for i := range db.Posts {
			if db.Posts[i].ID == post.RepostOfID {
				r := EnrichPost(db, &db.Posts[i])
				ep.Repost = &r
				break
			}
		}
	}
	return ep
}

func containsStr(slice []string, item string) bool {
	for _, s := range slice {
		if s == item {
			return true
		}
	}
	return false
}
