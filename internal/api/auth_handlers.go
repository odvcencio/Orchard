package api

import (
	"crypto/rand"
	"encoding/json"
	"net/http"

	"github.com/odvcencio/orchard/internal/auth"
	"github.com/odvcencio/orchard/internal/models"
)

type registerRequest struct {
	Username string `json:"username"`
	Email    string `json:"email"`
}

type tokenResponse struct {
	Token string       `json:"token"`
	User  *models.User `json:"user"`
}

func (s *Server) handleRegister(w http.ResponseWriter, r *http.Request) {
	var req registerRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		jsonError(w, "invalid request body", http.StatusBadRequest)
		return
	}
	if req.Username == "" || req.Email == "" {
		jsonError(w, "username and email are required", http.StatusBadRequest)
		return
	}

	// All accounts are passwordless — store an unusable hash
	random := make([]byte, 32)
	if _, err := rand.Read(random); err != nil {
		jsonError(w, "internal error", http.StatusInternalServerError)
		return
	}
	hash, err := s.authSvc.HashPassword(string(random))
	if err != nil {
		jsonError(w, "internal error", http.StatusInternalServerError)
		return
	}

	user := &models.User{
		Username:     req.Username,
		Email:        req.Email,
		PasswordHash: hash,
	}
	if err := s.db.CreateUser(r.Context(), user); err != nil {
		jsonError(w, "username or email already taken", http.StatusConflict)
		return
	}

	if s.requireVerifiedEmail {
		magicToken, expiresAt, err := s.issueMagicLinkToken(r.Context(), user)
		if err != nil {
			jsonError(w, "internal error", http.StatusInternalServerError)
			return
		}
		jsonResponse(w, http.StatusCreated, map[string]any{
			"user":                        user,
			"requires_email_verification": true,
			"requires_passkey_enrollment": s.requirePasskeyEnrollment,
			"magic_link_sent":             true,
			"magic_token":                 magicToken,
			"magic_expires_at":            expiresAt,
		})
		return
	}

	token, err := s.authSvc.GenerateToken(user.ID, user.Username)
	if err != nil {
		jsonError(w, "internal error", http.StatusInternalServerError)
		return
	}

	jsonResponse(w, http.StatusCreated, tokenResponse{Token: token, User: user})
}

func (s *Server) handleRefreshToken(w http.ResponseWriter, r *http.Request) {
	claims := auth.GetClaims(r.Context())
	token, err := s.authSvc.GenerateToken(claims.UserID, claims.Username)
	if err != nil {
		jsonError(w, "internal error", http.StatusInternalServerError)
		return
	}
	user, err := s.db.GetUserByID(r.Context(), claims.UserID)
	if err != nil {
		jsonError(w, "user not found", http.StatusNotFound)
		return
	}
	jsonResponse(w, http.StatusOK, tokenResponse{Token: token, User: user})
}

func (s *Server) handleGetCurrentUser(w http.ResponseWriter, r *http.Request) {
	claims := auth.GetClaims(r.Context())
	user, err := s.db.GetUserByID(r.Context(), claims.UserID)
	if err != nil {
		jsonError(w, "user not found", http.StatusNotFound)
		return
	}
	jsonResponse(w, http.StatusOK, user)
}
