package models

type Database struct {
	Users           []User              `json:"users"`
	Companies       []Company           `json:"companies"`
	Posts           []Post              `json:"posts"`
	Comments        []Comment           `json:"comments"`
	Jobs            []Job               `json:"jobs"`
	Groups          []Group             `json:"groups"`
	Courses         []Course            `json:"courses"`
	Invitations     []Invitation        `json:"invitations"`
	Threads         []Thread            `json:"threads"`
	Messages        []Message           `json:"messages"`
	Notifications   []Notification      `json:"notifications"`
	Events          []Event             `json:"events"`
	Settings        []Settings          `json:"settings"`
	JobApplications []JobApplication    `json:"jobApplications"`
	SavedJobIds     map[string][]string `json:"savedJobIds"`
	JobAlerts       []JobAlert          `json:"jobAlerts"`
	CourseProgress  []CourseProgress    `json:"courseProgress"`
	Sessions        map[string]string   `json:"sessions"`
}

type User struct {
	ID            string       `json:"id"`
	Email         string       `json:"email"`
	Password      string       `json:"password"`
	Username      string       `json:"username"`
	FirstName     string       `json:"firstName"`
	LastName      string       `json:"lastName"`
	Headline      string       `json:"headline"`
	Location      string       `json:"location"`
	AvatarURL     string       `json:"avatarUrl"`
	CoverURL      string       `json:"coverUrl"`
	About         string       `json:"about"`
	ConnectionIDs []string     `json:"connectionIds"`
	FollowerIDs   []string     `json:"followerIds"`
	FollowingIDs  []string     `json:"followingIds"`
	Experience    []Experience `json:"experience"`
	Education     []Education  `json:"education"`
	Skills        []Skill      `json:"skills"`
	FeaturedURL   string       `json:"featuredUrl,omitempty"`
	IsPremium     bool         `json:"isPremium,omitempty"`
	CompanyID     string       `json:"companyId,omitempty"`
}

type UserPublic struct {
	ID            string       `json:"id"`
	Username      string       `json:"username"`
	FirstName     string       `json:"firstName"`
	LastName      string       `json:"lastName"`
	Headline      string       `json:"headline"`
	Location      string       `json:"location"`
	AvatarURL     string       `json:"avatarUrl"`
	CoverURL      string       `json:"coverUrl"`
	About         string       `json:"about"`
	ConnectionIDs []string     `json:"connectionIds"`
	FollowerIDs   []string     `json:"followerIds"`
	FollowingIDs  []string     `json:"followingIds"`
	Experience    []Experience `json:"experience"`
	Education     []Education  `json:"education"`
	Skills        []Skill      `json:"skills"`
	FeaturedURL   string       `json:"featuredUrl,omitempty"`
	IsPremium     bool         `json:"isPremium,omitempty"`
	CompanyID     string       `json:"companyId,omitempty"`
}

type Experience struct {
	ID          string `json:"id"`
	Title       string `json:"title"`
	Company     string `json:"company"`
	Location    string `json:"location,omitempty"`
	StartDate   string `json:"startDate"`
	EndDate     string `json:"endDate,omitempty"`
	Current     bool   `json:"current,omitempty"`
	Description string `json:"description,omitempty"`
}

type Education struct {
	ID        string `json:"id"`
	School    string `json:"school"`
	Degree    string `json:"degree"`
	Field     string `json:"field,omitempty"`
	StartDate string `json:"startDate"`
	EndDate   string `json:"endDate,omitempty"`
}

type Skill struct {
	ID   string `json:"id"`
	Name string `json:"name"`
	// Endorsements always equals len(EndorserIDs); kept for older clients.
	Endorsements int      `json:"endorsements"`
	EndorserIDs  []string `json:"endorserIds"`
	// Pinned skills are shown first as the owner's "Top skills".
	Pinned bool `json:"pinned,omitempty"`
}

type Comment struct {
	ID        string `json:"id"`
	PostID    string `json:"postId"`
	AuthorID  string `json:"authorId"`
	Content   string `json:"content"`
	CreatedAt string `json:"createdAt"`
}

type PostReaction struct {
	UserID string `json:"userId"`
	Type   string `json:"type"`
}

type Post struct {
	ID           string         `json:"id"`
	AuthorID     string         `json:"authorId"`
	Content      string         `json:"content"`
	ImageURL     string         `json:"imageUrl,omitempty"`
	ArticleURL   string         `json:"articleUrl,omitempty"`
	ArticleTitle string         `json:"articleTitle,omitempty"`
	Visibility   string         `json:"visibility"`
	CreatedAt    string         `json:"createdAt"`
	Reactions    []PostReaction `json:"reactions"`
	CommentIDs   []string       `json:"commentIds"`
	RepostOfID   string         `json:"repostOfId,omitempty"`
	CompanyID    string         `json:"companyId,omitempty"`
	GroupID      string         `json:"groupId,omitempty"`
	IsSponsored  bool           `json:"isSponsored,omitempty"`
}

type Job struct {
	ID              string   `json:"id"`
	Title           string   `json:"title"`
	CompanyID       string   `json:"companyId"`
	Location        string   `json:"location"`
	Remote          bool     `json:"remote"`
	ExperienceLevel string   `json:"experienceLevel"`
	EmploymentType  string   `json:"employmentType"`
	Description     string   `json:"description"`
	Qualifications  []string `json:"qualifications"`
	Salary          string   `json:"salary,omitempty"`
	Applicants      int      `json:"applicants"`
	PostedAt        string   `json:"postedAt"`
	Promoted        bool     `json:"promoted,omitempty"`
}

type JobApplication struct {
	ID         string `json:"id"`
	JobID      string `json:"jobId"`
	UserID     string `json:"userId"`
	ResumeName string `json:"resumeName"`
	AppliedAt  string `json:"appliedAt"`
}

type Company struct {
	ID           string   `json:"id"`
	Slug         string   `json:"slug"`
	Name         string   `json:"name"`
	Tagline      string   `json:"tagline"`
	Industry     string   `json:"industry"`
	Size         string   `json:"size"`
	Headquarters string   `json:"headquarters"`
	About        string   `json:"about"`
	LogoURL      string   `json:"logoUrl"`
	BannerURL    string   `json:"bannerUrl"`
	Specialties  []string `json:"specialties"`
	FollowerIDs  []string `json:"followerIds"`
	EmployeeIDs  []string `json:"employeeIds"`
}

type Group struct {
	ID          string   `json:"id"`
	Name        string   `json:"name"`
	Description string   `json:"description"`
	MemberIDs   []string `json:"memberIds"`
	ImageURL    string   `json:"imageUrl"`
	Privacy     string   `json:"privacy"`
}

type Lesson struct {
	ID              string `json:"id"`
	Title           string `json:"title"`
	DurationMinutes int    `json:"durationMinutes"`
}

type Course struct {
	ID            string   `json:"id"`
	Title         string   `json:"title"`
	Description   string   `json:"description"`
	Instructor    string   `json:"instructor"`
	ThumbnailURL  string   `json:"thumbnailUrl"`
	DurationHours int      `json:"durationHours"`
	Lessons       []Lesson `json:"lessons"`
	Category      string   `json:"category"`
}

type CourseProgress struct {
	CourseID           string   `json:"courseId"`
	UserID             string   `json:"userId"`
	CompletedLessonIDs []string `json:"completedLessonIds"`
	Percent            int      `json:"percent"`
}

type Invitation struct {
	ID         string `json:"id"`
	FromUserID string `json:"fromUserId"`
	ToUserID   string `json:"toUserId"`
	Message    string `json:"message,omitempty"`
	CreatedAt  string `json:"createdAt"`
}

type Thread struct {
	ID             string         `json:"id"`
	ParticipantIDs []string       `json:"participantIds"`
	LastMessageAt  string         `json:"lastMessageAt"`
	UnreadBy       map[string]int `json:"unreadBy"`
}

type Message struct {
	ID        string `json:"id"`
	ThreadID  string `json:"threadId"`
	SenderID  string `json:"senderId"`
	Content   string `json:"content"`
	CreatedAt string `json:"createdAt"`
	Read      bool   `json:"read"`
}

type Notification struct {
	ID        string `json:"id"`
	UserID    string `json:"userId"`
	Type      string `json:"type"`
	Title     string `json:"title"`
	Body      string `json:"body"`
	Link      string `json:"link,omitempty"`
	Read      bool   `json:"read"`
	CreatedAt string `json:"createdAt"`
	ActorID   string `json:"actorId,omitempty"`
}

type Event struct {
	ID          string   `json:"id"`
	Title       string   `json:"title"`
	Date        string   `json:"date"`
	Location    string   `json:"location"`
	ImageURL    string   `json:"imageUrl"`
	AttendeeIDs []string `json:"attendeeIds"`
}

type JobAlert struct {
	ID        string `json:"id"`
	UserID    string `json:"userId"`
	Query     string `json:"query"`
	Location  string `json:"location"`
	CreatedAt string `json:"createdAt"`
}

type Settings struct {
	UserID             string `json:"userId"`
	EmailNotifications bool   `json:"emailNotifications"`
	PushNotifications  bool   `json:"pushNotifications"`
	ProfileVisibility  string `json:"profileVisibility"`
	ActivityVisibility bool   `json:"activityVisibility"`
	MessagingFrom      string `json:"messagingFrom"`
	Language           string `json:"language"`
	Theme              string `json:"theme"`
}

type AuthResponse struct {
	Token string     `json:"token"`
	User  UserPublic `json:"user"`
}

type PaginatedFeed struct {
	Items   []EnrichedPost `json:"items"`
	Page    int            `json:"page"`
	Total   int            `json:"total"`
	HasMore bool           `json:"hasMore"`
}

type EnrichedPost struct {
	Post
	Author          *UserPublic       `json:"author"`
	Comments        []EnrichedComment `json:"comments"`
	Repost          *EnrichedPost     `json:"repost,omitempty"`
	ReactionSummary map[string]int    `json:"reactionSummary"`
	TotalReactions  int               `json:"totalReactions"`
}

type EnrichedComment struct {
	Comment
	Author UserPublic `json:"author"`
}

type ErrorResponse struct {
	Message string `json:"message"`
}
