package service

import "github.com/linkedin-clone/api/internal/models"

func ToPublicUser(u *models.User) models.UserPublic {
	return models.UserPublic{
		ID: u.ID, Username: u.Username, FirstName: u.FirstName, LastName: u.LastName,
		Headline: u.Headline, Location: u.Location, AvatarURL: u.AvatarURL, CoverURL: u.CoverURL,
		About: u.About, ConnectionIDs: u.ConnectionIDs, FollowerIDs: u.FollowerIDs,
		FollowingIDs: u.FollowingIDs, Experience: u.Experience, Education: u.Education,
		Skills: u.Skills, FeaturedURL: u.FeaturedURL, IsPremium: u.IsPremium, CompanyID: u.CompanyID,
	}
}

func FindUser(db *models.Database, idOrUsername string) *models.User {
	for i := range db.Users {
		u := &db.Users[i]
		if u.ID == idOrUsername || u.Username == idOrUsername {
			return u
		}
	}
	return nil
}

func ConnectionDegree(viewerID string, target *models.User, db *models.Database) *int {
	if viewerID == "" || viewerID == target.ID {
		return nil
	}
	viewer := FindUser(db, viewerID)
	if viewer == nil {
		return nil
	}
	if utilContains(viewer.ConnectionIDs, target.ID) {
		d := 1
		return &d
	}
	for _, cid := range target.ConnectionIDs {
		if utilContains(viewer.ConnectionIDs, cid) {
			d := 2
			return &d
		}
	}
	d := 3
	return &d
}

func utilContains(s []string, x string) bool {
	for _, v := range s {
		if v == x {
			return true
		}
	}
	return false
}
