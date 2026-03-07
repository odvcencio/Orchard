package api

import (
	"context"
	"crypto/md5"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/odvcencio/orchard/internal/auth"
	"github.com/odvcencio/orchard/internal/models"
	"golang.org/x/crypto/ssh"
)

type createSSHKeyRequest struct {
	Name      string `json:"name"`
	PublicKey string `json:"public_key"`
}

type passkeyDescriptor struct {
	ID           int64   `json:"id"`
	CredentialID string  `json:"credential_id"`
	CreatedAt    string  `json:"created_at"`
	LastUsedAt   *string `json:"last_used_at,omitempty"`
}

func (s *Server) handleListSSHKeys(w http.ResponseWriter, r *http.Request) {
	claims := auth.GetClaims(r.Context())
	keys, err := s.db.ListSSHKeys(r.Context(), claims.UserID)
	if err != nil {
		jsonError(w, "internal error", http.StatusInternalServerError)
		return
	}
	if keys == nil {
		keys = []models.SSHKey{}
	}
	jsonResponse(w, http.StatusOK, keys)
}

func (s *Server) handleCreateSSHKey(w http.ResponseWriter, r *http.Request) {
	claims := auth.GetClaims(r.Context())
	var req createSSHKeyRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		jsonError(w, "invalid request body", http.StatusBadRequest)
		return
	}
	key, err := buildSSHKeyModel(claims.UserID, req.Name, req.PublicKey)
	if err != nil {
		jsonError(w, err.Error(), http.StatusBadRequest)
		return
	}
	if err := s.db.CreateSSHKey(r.Context(), key); err != nil {
		jsonError(w, "key already exists", http.StatusConflict)
		return
	}
	jsonResponse(w, http.StatusCreated, key)
}

func (s *Server) handleDeleteSSHKey(w http.ResponseWriter, r *http.Request) {
	claims := auth.GetClaims(r.Context())
	id, ok := parsePathPositiveInt64(w, r, "id", "key ID")
	if !ok {
		return
	}
	if err := s.db.DeleteSSHKey(r.Context(), id, claims.UserID); err != nil {
		jsonError(w, "internal error", http.StatusInternalServerError)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (s *Server) handleListPasskeys(w http.ResponseWriter, r *http.Request) {
	claims := auth.GetClaims(r.Context())
	credentials, err := s.db.ListWebAuthnCredentials(r.Context(), claims.UserID)
	if err != nil {
		jsonError(w, "internal error", http.StatusInternalServerError)
		return
	}
	resp := make([]passkeyDescriptor, 0, len(credentials))
	for _, cred := range credentials {
		item := passkeyDescriptor{
			ID:           cred.ID,
			CredentialID: cred.CredentialID,
			CreatedAt:    cred.CreatedAt.UTC().Format(time.RFC3339),
		}
		if cred.LastUsedAt != nil {
			lastUsed := cred.LastUsedAt.UTC().Format(time.RFC3339)
			item.LastUsedAt = &lastUsed
		}
		resp = append(resp, item)
	}
	jsonResponse(w, http.StatusOK, resp)
}

func buildSSHKeyModel(userID int64, name, publicKey string) (*models.SSHKey, error) {
	keyName := strings.TrimSpace(name)
	keyMaterial := strings.TrimSpace(publicKey)
	if keyName == "" || keyMaterial == "" {
		return nil, fmt.Errorf("name and public_key are required")
	}

	pubKey, _, _, _, err := ssh.ParseAuthorizedKey([]byte(keyMaterial))
	if err != nil {
		return nil, fmt.Errorf("invalid SSH public key")
	}

	fp := fmt.Sprintf("%x", md5.Sum(pubKey.Marshal()))
	return &models.SSHKey{
		UserID:      userID,
		Name:        keyName,
		Fingerprint: fp,
		PublicKey:   keyMaterial,
		KeyType:     pubKey.Type(),
	}, nil
}

func createSSHKeyForUser(ctx context.Context, dbCtx interface {
	CreateSSHKey(ctx context.Context, key *models.SSHKey) error
}, userID int64, req createSSHKeyRequest) (*models.SSHKey, error) {
	key, err := buildSSHKeyModel(userID, req.Name, req.PublicKey)
	if err != nil {
		return nil, err
	}
	if err := dbCtx.CreateSSHKey(ctx, key); err != nil {
		return nil, err
	}
	return key, nil
}
