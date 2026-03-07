package api

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"net/http"
	"strings"

	"github.com/odvcencio/orchard/internal/auth"
	"github.com/odvcencio/orchard/internal/models"
)

func (s *Server) authorizeProtocolRepoAccess(r *http.Request, owner, repo string, write bool) (int, error) {
	user, authenticated, status, authErr := s.authenticateProtocolUser(r)
	if authErr != nil {
		return status, authErr
	}

	repoModel, err := s.repoSvc.Get(r.Context(), owner, repo)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return http.StatusNotFound, fmt.Errorf("repository not found")
		}
		return http.StatusInternalServerError, fmt.Errorf("repository lookup failed")
	}

	// Anonymous read is allowed for public repos.
	if !write && !repoModel.IsPrivate {
		return http.StatusOK, nil
	}

	if !authenticated || user == nil {
		return http.StatusUnauthorized, fmt.Errorf("authentication required")
	}
	if write {
		ready, reasons, err := s.accountOnboardingStatus(r.Context(), user.ID)
		if err != nil {
			return http.StatusInternalServerError, fmt.Errorf("authorization failed")
		}
		if !ready {
			return http.StatusForbidden, errors.New(formatOnboardingReasons(reasons))
		}
	}

	allowed, err := s.userHasRepoAccess(r.Context(), repoModel, user.ID, write)
	if err != nil {
		return http.StatusInternalServerError, fmt.Errorf("authorization failed")
	}
	if !allowed {
		return http.StatusForbidden, fmt.Errorf("forbidden")
	}

	return http.StatusOK, nil
}

func (s *Server) authenticateProtocolUser(r *http.Request) (*models.User, bool, int, error) {
	if claims := auth.GetClaims(r.Context()); claims != nil {
		u, err := s.db.GetUserByID(r.Context(), claims.UserID)
		if err != nil {
			if errors.Is(err, sql.ErrNoRows) {
				return nil, false, http.StatusUnauthorized, fmt.Errorf("invalid token")
			}
			return nil, false, http.StatusInternalServerError, fmt.Errorf("user lookup failed")
		}
		return u, true, http.StatusOK, nil
	}

	// For protocol clients, allow Basic auth where password is a bearer token.
	// This enables standard Git credential helpers without re-enabling password auth.
	if basicUser, basicSecret, ok := r.BasicAuth(); ok {
		basicSecret = strings.TrimSpace(basicSecret)
		if basicSecret == "" {
			return nil, false, http.StatusUnauthorized, fmt.Errorf("authentication required")
		}
		claims, err := s.authSvc.ValidateToken(basicSecret)
		if err != nil {
			return nil, false, http.StatusUnauthorized, fmt.Errorf("invalid token")
		}
		u, err := s.db.GetUserByID(r.Context(), claims.UserID)
		if err != nil {
			if errors.Is(err, sql.ErrNoRows) {
				return nil, false, http.StatusUnauthorized, fmt.Errorf("invalid token")
			}
			return nil, false, http.StatusInternalServerError, fmt.Errorf("user lookup failed")
		}
		if username := strings.TrimSpace(basicUser); username != "" && !strings.EqualFold(username, u.Username) {
			return nil, false, http.StatusUnauthorized, fmt.Errorf("invalid token")
		}
		return u, true, http.StatusOK, nil
	}

	return nil, false, http.StatusOK, nil
}

func (s *Server) userHasRepoAccess(ctx context.Context, repo *models.Repository, userID int64, write bool) (bool, error) {
	if repo.OwnerUserID != nil && *repo.OwnerUserID == userID {
		return true, nil
	}

	if repo.OwnerOrgID != nil {
		if _, err := s.db.GetOrgMember(ctx, *repo.OwnerOrgID, userID); err == nil {
			return true, nil
		} else if !errors.Is(err, sql.ErrNoRows) {
			return false, err
		}
	}

	collab, err := s.db.GetCollaborator(ctx, repo.ID, userID)
	if err == nil {
		if !write {
			return true, nil
		}
		return collab.Role == "write" || collab.Role == "admin", nil
	}
	if !errors.Is(err, sql.ErrNoRows) {
		return false, err
	}

	return false, nil
}
