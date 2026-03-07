package api

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"strings"
	"time"

	"github.com/odvcencio/orchard/internal/auth"
	"github.com/odvcencio/orchard/internal/models"
)

type createRepoRequest struct {
	Name                 string `json:"name"`
	Description          string `json:"description"`
	Private              bool   `json:"private"`
	InitializeWithReadme bool   `json:"initialize_with_readme"`
	InitReadme           bool   `json:"init_readme"`
}

type forkRepoRequest struct {
	Name string `json:"name"`
}

type repoCreationPolicyResponse struct {
	CanCreatePublic     bool     `json:"can_create_public"`
	CanCreatePrivate    bool     `json:"can_create_private"`
	PublicRepoCount     int      `json:"public_repo_count"`
	PrivateRepoCount    int      `json:"private_repo_count"`
	MaxPublicRepos      int      `json:"max_public_repos"`
	MaxPrivateRepos     int      `json:"max_private_repos"`
	RestrictToPublic    bool     `json:"restrict_to_public"`
	RequirePrivatePlan  bool     `json:"require_private_plan"`
	PrivatePlanEligible bool     `json:"private_plan_eligible"`
	PublicReason        string   `json:"public_reason,omitempty"`
	PrivateReason       string   `json:"private_reason,omitempty"`
	Reasons             []string `json:"reasons,omitempty"`
}

type repoCreationPolicy struct {
	CanCreatePublic     bool
	CanCreatePrivate    bool
	PublicRepoCount     int
	PrivateRepoCount    int
	MaxPublicRepos      int
	MaxPrivateRepos     int
	RestrictToPublic    bool
	RequirePrivatePlan  bool
	PrivatePlanEligible bool
	PublicReason        string
	PrivateReason       string
}

func (s *Server) handleCreateRepo(w http.ResponseWriter, r *http.Request) {
	claims := auth.GetClaims(r.Context())
	if !s.ensureAccountOnboarding(w, r, claims.UserID) {
		return
	}
	var req createRepoRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		jsonError(w, "invalid request body", http.StatusBadRequest)
		return
	}
	if req.Name == "" {
		jsonError(w, "name is required", http.StatusBadRequest)
		return
	}
	if status, message := s.validateRepoVisibilityPolicy(r.Context(), claims.UserID, req.Private); status != 0 {
		jsonError(w, message, status)
		return
	}

	initializeReadme := req.InitializeWithReadme || req.InitReadme
	repo, err := s.repoSvc.Create(r.Context(), claims.UserID, req.Name, req.Description, req.Private, initializeReadme)
	if err != nil {
		jsonError(w, err.Error(), http.StatusBadRequest)
		return
	}
	repo.OwnerName = claims.Username
	jsonResponse(w, http.StatusCreated, repo)
}

func (s *Server) handleGetRepo(w http.ResponseWriter, r *http.Request) {
	repo, ok := s.authorizeRepoRequest(w, r, false)
	if !ok {
		return
	}
	if repo.ParentRepoID != nil && *repo.ParentRepoID > 0 && (repo.ParentOwner == "" || repo.ParentName == "") {
		if parent, err := s.repoSvc.GetByID(r.Context(), *repo.ParentRepoID); err == nil {
			repo.ParentOwner = parent.OwnerName
			repo.ParentName = parent.Name
		}
	}
	jsonResponse(w, http.StatusOK, repo)
}

func (s *Server) handleListUserRepos(w http.ResponseWriter, r *http.Request) {
	claims := auth.GetClaims(r.Context())
	page, perPage := parsePagination(r, 30, 200)
	repos, err := s.repoSvc.ListPage(r.Context(), claims.UserID, page, perPage)
	if err != nil {
		jsonError(w, "internal error", http.StatusInternalServerError)
		return
	}
	if repos == nil {
		repos = []models.Repository{}
	}
	jsonResponse(w, http.StatusOK, repos)
}

func (s *Server) handleDeleteRepo(w http.ResponseWriter, r *http.Request) {
	claims := auth.GetClaims(r.Context())
	repo, ok := s.authorizeRepoRequest(w, r, true)
	if !ok {
		return
	}

	// Only owner can delete
	if repo.OwnerUserID == nil || claims.UserID != *repo.OwnerUserID {
		jsonError(w, "forbidden", http.StatusForbidden)
		return
	}

	if err := s.repoSvc.Delete(r.Context(), repo.ID); err != nil {
		jsonError(w, "internal error", http.StatusInternalServerError)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (s *Server) handleForkRepo(w http.ResponseWriter, r *http.Request) {
	claims := auth.GetClaims(r.Context())
	if !s.ensureAccountOnboarding(w, r, claims.UserID) {
		return
	}
	sourceRepo, ok := s.authorizeRepoRequest(w, r, false)
	if !ok {
		return
	}

	req := forkRepoRequest{}
	if r.Body != nil {
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil && !errors.Is(err, io.EOF) {
			jsonError(w, "invalid request body", http.StatusBadRequest)
			return
		}
	}
	if status, message := s.validateRepoVisibilityPolicy(r.Context(), claims.UserID, sourceRepo.IsPrivate); status != 0 {
		jsonError(w, message, status)
		return
	}

	fork, err := s.repoSvc.Fork(r.Context(), sourceRepo.ID, claims.UserID, req.Name)
	if err != nil {
		jsonError(w, err.Error(), http.StatusBadRequest)
		return
	}
	fork.OwnerName = claims.Username
	fork.ParentOwner = sourceRepo.OwnerName
	fork.ParentName = sourceRepo.Name
	jsonResponse(w, http.StatusCreated, fork)
}

func (s *Server) handleListRepoForks(w http.ResponseWriter, r *http.Request) {
	sourceRepo, ok := s.authorizeRepoRequest(w, r, false)
	if !ok {
		return
	}
	page, perPage := parsePagination(r, 30, 200)
	forks, err := s.repoSvc.ListForksPage(r.Context(), sourceRepo.ID, page, perPage)
	if err != nil {
		jsonError(w, "internal error", http.StatusInternalServerError)
		return
	}
	if forks == nil {
		forks = []models.Repository{}
	}
	jsonResponse(w, http.StatusOK, forks)
}

func (s *Server) handleGetRepoCreationPolicy(w http.ResponseWriter, r *http.Request) {
	claims := auth.GetClaims(r.Context())
	policy, err := s.evaluateRepoCreationPolicy(r.Context(), claims.UserID, claims.Username)
	if err != nil {
		jsonError(w, "internal error", http.StatusInternalServerError)
		return
	}
	resp := repoCreationPolicyResponse{
		CanCreatePublic:     policy.CanCreatePublic,
		CanCreatePrivate:    policy.CanCreatePrivate,
		PublicRepoCount:     policy.PublicRepoCount,
		PrivateRepoCount:    policy.PrivateRepoCount,
		MaxPublicRepos:      policy.MaxPublicRepos,
		MaxPrivateRepos:     policy.MaxPrivateRepos,
		RestrictToPublic:    policy.RestrictToPublic,
		RequirePrivatePlan:  policy.RequirePrivatePlan,
		PrivatePlanEligible: policy.PrivatePlanEligible,
		PublicReason:        policy.PublicReason,
		PrivateReason:       policy.PrivateReason,
	}
	if !policy.CanCreatePrivate && policy.PrivateReason != "" {
		resp.Reasons = append(resp.Reasons, policy.PrivateReason)
	}
	if !policy.CanCreatePublic && policy.PublicReason != "" && policy.PublicReason != policy.PrivateReason {
		resp.Reasons = append(resp.Reasons, policy.PublicReason)
	}
	jsonResponse(w, http.StatusOK, resp)
}

func (s *Server) validateRepoVisibilityPolicy(ctx context.Context, userID int64, isPrivate bool) (int, string) {
	policy, err := s.evaluateRepoCreationPolicy(ctx, userID, "")
	if err != nil {
		return http.StatusInternalServerError, "internal error"
	}
	if isPrivate {
		if policy.CanCreatePrivate {
			return 0, ""
		}
		if policy.PrivateReason != "" {
			return http.StatusForbidden, policy.PrivateReason
		}
		return http.StatusForbidden, "private repositories are not available for this account"
	}
	if policy.CanCreatePublic {
		return 0, ""
	}
	if policy.PublicReason != "" {
		return http.StatusForbidden, policy.PublicReason
	}
	return http.StatusForbidden, "public repositories are not available for this account"
}

func (s *Server) evaluateRepoCreationPolicy(ctx context.Context, userID int64, username string) (repoCreationPolicy, error) {
	policy := repoCreationPolicy{
		CanCreatePublic:     true,
		CanCreatePrivate:    true,
		MaxPublicRepos:      s.maxPublicRepos,
		MaxPrivateRepos:     s.maxPrivateRepos,
		RestrictToPublic:    s.restrictPublicOnly,
		RequirePrivatePlan:  s.requirePrivatePlan,
		PrivatePlanEligible: !s.requirePrivatePlan,
	}

	publicCount, err := s.countUserOwnedRepositoriesByVisibility(ctx, userID, false)
	if err != nil {
		return repoCreationPolicy{}, err
	}
	privateCount, err := s.countUserOwnedRepositoriesByVisibility(ctx, userID, true)
	if err != nil {
		return repoCreationPolicy{}, err
	}
	policy.PublicRepoCount = publicCount
	policy.PrivateRepoCount = privateCount

	if policy.MaxPublicRepos > 0 && publicCount >= policy.MaxPublicRepos {
		policy.CanCreatePublic = false
		policy.PublicReason = "public repository limit reached for this account"
	}

	if policy.RestrictToPublic {
		policy.CanCreatePrivate = false
		policy.PrivateReason = "private repositories are disabled on this instance"
		return policy, nil
	}

	if policy.RequirePrivatePlan {
		eligible, err := s.privateRepoPlanEligible(ctx, userID, username)
		if err != nil {
			return repoCreationPolicy{}, err
		}
		policy.PrivatePlanEligible = eligible
		if !eligible {
			policy.CanCreatePrivate = false
			policy.PrivateReason = "private repositories require an eligible plan for this account"
			return policy, nil
		}
	}

	if policy.MaxPrivateRepos > 0 && privateCount >= policy.MaxPrivateRepos {
		policy.CanCreatePrivate = false
		policy.PrivateReason = "private repository limit reached for this account"
	}
	return policy, nil
}

func (s *Server) countUserOwnedRepositoriesByVisibility(ctx context.Context, userID int64, isPrivate bool) (int, error) {
	count, err := s.db.CountUserOwnedRepositoriesByVisibility(ctx, userID, isPrivate)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return 0, nil
		}
		return 0, err
	}
	return count, nil
}

func (s *Server) privateRepoPlanEligible(ctx context.Context, userID int64, username string) (bool, error) {
	if !s.requirePrivatePlan {
		return true, nil
	}
	hasEntitlement, err := s.db.HasUserEntitlement(ctx, userID, models.EntitlementFeaturePrivateRepos, time.Now().UTC())
	if err != nil {
		return false, err
	}
	if hasEntitlement {
		return true, nil
	}
	candidate := strings.TrimSpace(username)
	if candidate == "" {
		user, err := s.db.GetUserByID(ctx, userID)
		if err != nil {
			if errors.Is(err, sql.ErrNoRows) {
				return false, nil
			}
			return false, err
		}
		if user == nil {
			return false, nil
		}
		candidate = strings.TrimSpace(user.Username)
	}
	_, ok := s.privateRepoAllowed[candidate]
	return ok, nil
}
