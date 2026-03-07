package api

import (
	"context"
	"crypto/hmac"
	"crypto/rand"
	"crypto/sha256"
	"database/sql"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/go-webauthn/webauthn/protocol"
	"github.com/go-webauthn/webauthn/webauthn"
	"github.com/google/uuid"
	"github.com/odvcencio/orchard/internal/auth"
	"github.com/odvcencio/orchard/internal/models"
	"golang.org/x/crypto/ssh"
)

const (
	magicLinkTTL       = 15 * time.Minute
	sshChallengeTTL    = 5 * time.Minute
	webauthnSessionTTL = 10 * time.Minute

	sshBootstrapTokenVersion = 1
	sshBootstrapTokenMinTTL  = 30 * time.Second
	sshBootstrapTokenMaxTTL  = 15 * time.Minute
	sshBootstrapTokenDefault = 5 * time.Minute
)

type bootstrapSSHRequest struct {
	Username       string `json:"username"`
	Name           string `json:"name"`
	PublicKey      string `json:"public_key"`
	BootstrapToken string `json:"bootstrap_token"`
}

type createBootstrapTokenRequest struct {
	TTLSeconds int `json:"ttl_seconds,omitempty"`
}

type createBootstrapTokenResponse struct {
	BootstrapToken   string    `json:"bootstrap_token"`
	ExpiresAt        time.Time `json:"expires_at"`
	ExpiresInSeconds int64     `json:"expires_in_seconds"`
	Username         string    `json:"username"`
}

type sshBootstrapTokenPayload struct {
	Version  int    `json:"v"`
	UserID   int64  `json:"uid"`
	Username string `json:"usr"`
	Expires  int64  `json:"exp"`
	Nonce    string `json:"n"`
}

func (s *Server) handleRequestMagicLink(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Email string `json:"email"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		jsonError(w, "invalid request body", http.StatusBadRequest)
		return
	}
	email := strings.TrimSpace(strings.ToLower(req.Email))
	if email == "" {
		jsonError(w, "email is required", http.StatusBadRequest)
		return
	}

	resp := map[string]any{"sent": true}
	user, err := s.db.GetUserByEmail(r.Context(), email)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			// Avoid user enumeration.
			jsonResponse(w, http.StatusOK, resp)
			return
		}
		jsonError(w, "internal error", http.StatusInternalServerError)
		return
	}

	token, expires, err := s.issueMagicLinkToken(r.Context(), user)
	if err != nil {
		jsonError(w, "internal error", http.StatusInternalServerError)
		return
	}

	// Until outbound email delivery is integrated, expose token for first-party UI.
	resp["token"] = token
	resp["expires_at"] = expires
	slog.Info("magic link issued", "user_id", user.ID, "email", email)
	jsonResponse(w, http.StatusOK, resp)
}

func (s *Server) issueMagicLinkToken(ctx context.Context, user *models.User) (string, time.Time, error) {
	token, err := randomToken(32)
	if err != nil {
		return "", time.Time{}, err
	}
	expires := time.Now().Add(magicLinkTTL).UTC()
	if err := s.db.CreateMagicLinkToken(ctx, &models.MagicLinkToken{
		UserID:    user.ID,
		TokenHash: sha256Hex(token),
		ExpiresAt: expires,
	}); err != nil {
		return "", time.Time{}, err
	}
	return token, expires, nil
}

func (s *Server) handleVerifyMagicLink(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Token string `json:"token"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		jsonError(w, "invalid request body", http.StatusBadRequest)
		return
	}
	token := strings.TrimSpace(req.Token)
	if token == "" {
		jsonError(w, "token is required", http.StatusBadRequest)
		return
	}

	user, err := s.db.ConsumeMagicLinkToken(r.Context(), sha256Hex(token), time.Now().UTC())
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			jsonError(w, "invalid or expired token", http.StatusUnauthorized)
			return
		}
		jsonError(w, "internal error", http.StatusInternalServerError)
		return
	}

	jwtToken, err := s.authSvc.GenerateToken(user.ID, user.Username)
	if err != nil {
		jsonError(w, "internal error", http.StatusInternalServerError)
		return
	}
	jsonResponse(w, http.StatusOK, tokenResponse{Token: jwtToken, User: user})
}

func (s *Server) handleSSHChallenge(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Username    string `json:"username"`
		Fingerprint string `json:"fingerprint,omitempty"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		jsonError(w, "invalid request body", http.StatusBadRequest)
		return
	}
	username := strings.TrimSpace(req.Username)
	if username == "" {
		jsonError(w, "username is required", http.StatusBadRequest)
		return
	}

	user, err := s.db.GetUserByUsername(r.Context(), username)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			jsonError(w, "invalid credentials", http.StatusUnauthorized)
			return
		}
		jsonError(w, "internal error", http.StatusInternalServerError)
		return
	}
	keys, err := s.db.ListSSHKeys(r.Context(), user.ID)
	if err != nil {
		jsonError(w, "internal error", http.StatusInternalServerError)
		return
	}
	if len(keys) == 0 {
		jsonError(w, "no SSH keys registered for user", http.StatusBadRequest)
		return
	}
	var selected *models.SSHKey
	fp := strings.TrimSpace(req.Fingerprint)
	if fp == "" {
		selected = &keys[0]
	} else {
		for i := range keys {
			if keys[i].Fingerprint == fp {
				selected = &keys[i]
				break
			}
		}
	}
	if selected == nil {
		jsonError(w, "ssh key fingerprint not found", http.StatusBadRequest)
		return
	}

	challengeID := uuid.NewString()
	expires := time.Now().Add(sshChallengeTTL).UTC()
	challengeText := fmt.Sprintf(
		"orchard-ssh-auth-v1\nchallenge:%s\nuser:%s\nfingerprint:%s\nexpires:%d\n",
		challengeID,
		user.Username,
		selected.Fingerprint,
		expires.Unix(),
	)
	if err := s.db.CreateSSHAuthChallenge(r.Context(), &models.SSHAuthChallenge{
		ID:          challengeID,
		UserID:      user.ID,
		Fingerprint: selected.Fingerprint,
		Challenge:   challengeText,
		ExpiresAt:   expires,
	}); err != nil {
		jsonError(w, "internal error", http.StatusInternalServerError)
		return
	}
	jsonResponse(w, http.StatusOK, map[string]any{
		"challenge_id": challengeID,
		"challenge":    challengeText,
		"fingerprint":  selected.Fingerprint,
		"expires_at":   expires,
	})
}

func (s *Server) handleSSHVerify(w http.ResponseWriter, r *http.Request) {
	var req struct {
		ChallengeID     string `json:"challenge_id"`
		Signature       string `json:"signature"`        // base64(ssh.Signature.Blob)
		SignatureFormat string `json:"signature_format"` // e.g. ssh-ed25519, rsa-sha2-512
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		jsonError(w, "invalid request body", http.StatusBadRequest)
		return
	}
	if strings.TrimSpace(req.ChallengeID) == "" || strings.TrimSpace(req.Signature) == "" {
		jsonError(w, "challenge_id and signature are required", http.StatusBadRequest)
		return
	}

	challenge, err := s.db.ConsumeSSHAuthChallenge(r.Context(), strings.TrimSpace(req.ChallengeID), time.Now().UTC())
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			jsonError(w, "invalid or expired challenge", http.StatusUnauthorized)
			return
		}
		jsonError(w, "internal error", http.StatusInternalServerError)
		return
	}

	key, err := s.db.GetSSHKeyByFingerprint(r.Context(), challenge.Fingerprint)
	if err != nil {
		jsonError(w, "internal error", http.StatusInternalServerError)
		return
	}
	pubKey, _, _, _, err := ssh.ParseAuthorizedKey([]byte(key.PublicKey))
	if err != nil {
		jsonError(w, "stored ssh key is invalid", http.StatusInternalServerError)
		return
	}

	sigBlob, err := decodeBase64(req.Signature)
	if err != nil {
		jsonError(w, "signature must be valid base64", http.StatusBadRequest)
		return
	}
	sigFormat := strings.TrimSpace(req.SignatureFormat)
	if sigFormat == "" {
		sigFormat = pubKey.Type()
	}
	if err := pubKey.Verify([]byte(challenge.Challenge), &ssh.Signature{
		Format: sigFormat,
		Blob:   sigBlob,
	}); err != nil {
		jsonError(w, "invalid signature", http.StatusUnauthorized)
		return
	}

	user, err := s.db.GetUserByID(r.Context(), challenge.UserID)
	if err != nil {
		jsonError(w, "internal error", http.StatusInternalServerError)
		return
	}
	jwtToken, err := s.authSvc.GenerateToken(user.ID, user.Username)
	if err != nil {
		jsonError(w, "internal error", http.StatusInternalServerError)
		return
	}
	jsonResponse(w, http.StatusOK, tokenResponse{Token: jwtToken, User: user})
}

func (s *Server) handleCreateSSHBootstrapToken(w http.ResponseWriter, r *http.Request) {
	if strings.TrimSpace(s.bootstrapSSHToken) == "" {
		http.NotFound(w, r)
		return
	}
	claims := auth.GetClaims(r.Context())
	if claims == nil {
		jsonError(w, "authentication required", http.StatusUnauthorized)
		return
	}

	var req createBootstrapTokenRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil && !errors.Is(err, io.EOF) {
		jsonError(w, "invalid request body", http.StatusBadRequest)
		return
	}
	ttl := normalizeBootstrapTokenTTL(req.TTLSeconds)
	expiresAt := time.Now().UTC().Add(ttl)
	token, err := mintSSHBootstrapToken(s.bootstrapSSHToken, claims.UserID, claims.Username, expiresAt)
	if err != nil {
		jsonError(w, "failed to mint bootstrap token", http.StatusInternalServerError)
		return
	}
	jsonResponse(w, http.StatusCreated, createBootstrapTokenResponse{
		BootstrapToken:   token,
		ExpiresAt:        expiresAt,
		ExpiresInSeconds: int64(ttl / time.Second),
		Username:         claims.Username,
	})
}

func (s *Server) handleBootstrapSSH(w http.ResponseWriter, r *http.Request) {
	if strings.TrimSpace(s.bootstrapSSHToken) == "" {
		http.NotFound(w, r)
		return
	}

	var req bootstrapSSHRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		jsonError(w, "invalid request body", http.StatusBadRequest)
		return
	}
	if strings.TrimSpace(req.Username) == "" || strings.TrimSpace(req.Name) == "" || strings.TrimSpace(req.PublicKey) == "" || strings.TrimSpace(req.BootstrapToken) == "" {
		jsonError(w, "username, name, public_key, and bootstrap_token are required", http.StatusBadRequest)
		return
	}
	payload, err := verifySSHBootstrapToken(req.BootstrapToken, s.bootstrapSSHToken, time.Now().UTC())
	if err != nil {
		jsonError(w, "invalid bootstrap token", http.StatusUnauthorized)
		return
	}
	requestedUsername := strings.TrimSpace(req.Username)
	if payload.Username != requestedUsername {
		jsonError(w, "invalid bootstrap request", http.StatusUnauthorized)
		return
	}
	user, err := s.db.GetUserByID(r.Context(), payload.UserID)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			jsonError(w, "invalid bootstrap request", http.StatusUnauthorized)
			return
		}
		jsonError(w, "internal error", http.StatusInternalServerError)
		return
	}
	if user.Username != requestedUsername {
		jsonError(w, "invalid bootstrap request", http.StatusUnauthorized)
		return
	}
	keys, err := s.db.ListSSHKeys(r.Context(), user.ID)
	if err != nil {
		jsonError(w, "internal error", http.StatusInternalServerError)
		return
	}
	if len(keys) > 0 {
		jsonError(w, "ssh keys already registered for user", http.StatusConflict)
		return
	}

	key, err := createSSHKeyForUser(r.Context(), s.db, user.ID, createSSHKeyRequest{
		Name:      req.Name,
		PublicKey: req.PublicKey,
	})
	if err != nil {
		if strings.Contains(strings.ToLower(err.Error()), "required") || strings.Contains(strings.ToLower(err.Error()), "invalid ssh public key") {
			jsonError(w, err.Error(), http.StatusBadRequest)
			return
		}
		jsonError(w, "key already exists", http.StatusConflict)
		return
	}

	jwtToken, err := s.authSvc.GenerateToken(user.ID, user.Username)
	if err != nil {
		jsonError(w, "internal error", http.StatusInternalServerError)
		return
	}
	jsonResponse(w, http.StatusOK, map[string]any{
		"token": jwtToken,
		"user":  user,
		"key":   key,
	})
}

func (s *Server) handleBeginWebAuthnRegistration(w http.ResponseWriter, r *http.Request) {
	if s.passkey == nil {
		jsonError(w, "webauthn is not configured", http.StatusServiceUnavailable)
		return
	}
	claims := auth.GetClaims(r.Context())
	user, err := s.db.GetUserByID(r.Context(), claims.UserID)
	if err != nil {
		jsonError(w, "user not found", http.StatusNotFound)
		return
	}
	waUser, err := s.loadWebAuthnUser(r.Context(), user)
	if err != nil {
		jsonError(w, "internal error", http.StatusInternalServerError)
		return
	}

	options, sessionData, err := s.passkey.BeginRegistration(waUser, webauthn.WithResidentKeyRequirement(protocol.ResidentKeyRequirementPreferred))
	if err != nil {
		jsonError(w, err.Error(), http.StatusBadRequest)
		return
	}
	if sessionData.Expires.IsZero() {
		sessionData.Expires = time.Now().Add(webauthnSessionTTL).UTC()
	}
	raw, err := json.Marshal(sessionData)
	if err != nil {
		jsonError(w, "internal error", http.StatusInternalServerError)
		return
	}
	sessionID := uuid.NewString()
	if err := s.db.CreateWebAuthnSession(r.Context(), &models.WebAuthnSession{
		ID:        sessionID,
		UserID:    user.ID,
		Flow:      "register",
		DataJSON:  string(raw),
		ExpiresAt: sessionData.Expires,
	}); err != nil {
		jsonError(w, "internal error", http.StatusInternalServerError)
		return
	}
	jsonResponse(w, http.StatusOK, map[string]any{
		"session_id": sessionID,
		"options":    options,
	})
}

func (s *Server) handleFinishWebAuthnRegistration(w http.ResponseWriter, r *http.Request) {
	if s.passkey == nil {
		jsonError(w, "webauthn is not configured", http.StatusServiceUnavailable)
		return
	}
	var req struct {
		SessionID  string          `json:"session_id"`
		Credential json.RawMessage `json:"credential"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		jsonError(w, "invalid request body", http.StatusBadRequest)
		return
	}
	if strings.TrimSpace(req.SessionID) == "" || len(req.Credential) == 0 {
		jsonError(w, "session_id and credential are required", http.StatusBadRequest)
		return
	}

	claims := auth.GetClaims(r.Context())
	sessionRec, err := s.db.ConsumeWebAuthnSession(r.Context(), strings.TrimSpace(req.SessionID), "register", time.Now().UTC())
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			jsonError(w, "invalid or expired session", http.StatusUnauthorized)
			return
		}
		jsonError(w, "internal error", http.StatusInternalServerError)
		return
	}
	if sessionRec.UserID != claims.UserID {
		jsonError(w, "forbidden", http.StatusForbidden)
		return
	}

	user, err := s.db.GetUserByID(r.Context(), claims.UserID)
	if err != nil {
		jsonError(w, "user not found", http.StatusNotFound)
		return
	}
	waUser, err := s.loadWebAuthnUser(r.Context(), user)
	if err != nil {
		jsonError(w, "internal error", http.StatusInternalServerError)
		return
	}

	var sessionData webauthn.SessionData
	if err := json.Unmarshal([]byte(sessionRec.DataJSON), &sessionData); err != nil {
		jsonError(w, "invalid session data", http.StatusInternalServerError)
		return
	}
	parsed, err := protocol.ParseCredentialCreationResponseBytes(req.Credential)
	if err != nil {
		jsonError(w, "invalid credential response", http.StatusBadRequest)
		return
	}
	credential, err := s.passkey.CreateCredential(waUser, sessionData, parsed)
	if err != nil {
		jsonError(w, "credential validation failed", http.StatusBadRequest)
		return
	}
	credRaw, err := json.Marshal(credential)
	if err != nil {
		jsonError(w, "internal error", http.StatusInternalServerError)
		return
	}
	credID := base64.RawURLEncoding.EncodeToString(credential.ID)
	if err := s.db.CreateWebAuthnCredential(r.Context(), &models.WebAuthnCredential{
		UserID:       user.ID,
		CredentialID: credID,
		DataJSON:     string(credRaw),
	}); err != nil {
		jsonError(w, "credential already exists", http.StatusConflict)
		return
	}
	jsonResponse(w, http.StatusCreated, map[string]any{"credential_id": credID})
}

func (s *Server) handleBeginWebAuthnLogin(w http.ResponseWriter, r *http.Request) {
	if s.passkey == nil {
		jsonError(w, "webauthn is not configured", http.StatusServiceUnavailable)
		return
	}
	var req struct {
		Username string `json:"username"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		jsonError(w, "invalid request body", http.StatusBadRequest)
		return
	}
	username := strings.TrimSpace(req.Username)
	if username == "" {
		jsonError(w, "username is required", http.StatusBadRequest)
		return
	}
	user, err := s.db.GetUserByUsername(r.Context(), username)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			jsonError(w, "invalid credentials", http.StatusUnauthorized)
			return
		}
		jsonError(w, "internal error", http.StatusInternalServerError)
		return
	}
	waUser, err := s.loadWebAuthnUser(r.Context(), user)
	if err != nil {
		jsonError(w, "internal error", http.StatusInternalServerError)
		return
	}
	if len(waUser.credentials) == 0 {
		jsonError(w, "no passkeys registered for user", http.StatusBadRequest)
		return
	}

	options, sessionData, err := s.passkey.BeginLogin(waUser)
	if err != nil {
		jsonError(w, err.Error(), http.StatusBadRequest)
		return
	}
	if sessionData.Expires.IsZero() {
		sessionData.Expires = time.Now().Add(webauthnSessionTTL).UTC()
	}
	raw, err := json.Marshal(sessionData)
	if err != nil {
		jsonError(w, "internal error", http.StatusInternalServerError)
		return
	}
	sessionID := uuid.NewString()
	if err := s.db.CreateWebAuthnSession(r.Context(), &models.WebAuthnSession{
		ID:        sessionID,
		UserID:    user.ID,
		Flow:      "login",
		DataJSON:  string(raw),
		ExpiresAt: sessionData.Expires,
	}); err != nil {
		jsonError(w, "internal error", http.StatusInternalServerError)
		return
	}
	jsonResponse(w, http.StatusOK, map[string]any{
		"session_id": sessionID,
		"options":    options,
	})
}

func (s *Server) handleFinishWebAuthnLogin(w http.ResponseWriter, r *http.Request) {
	if s.passkey == nil {
		jsonError(w, "webauthn is not configured", http.StatusServiceUnavailable)
		return
	}
	var req struct {
		SessionID  string          `json:"session_id"`
		Credential json.RawMessage `json:"credential"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		jsonError(w, "invalid request body", http.StatusBadRequest)
		return
	}
	if strings.TrimSpace(req.SessionID) == "" || len(req.Credential) == 0 {
		jsonError(w, "session_id and credential are required", http.StatusBadRequest)
		return
	}

	sessionRec, err := s.db.ConsumeWebAuthnSession(r.Context(), strings.TrimSpace(req.SessionID), "login", time.Now().UTC())
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			jsonError(w, "invalid or expired session", http.StatusUnauthorized)
			return
		}
		jsonError(w, "internal error", http.StatusInternalServerError)
		return
	}
	user, err := s.db.GetUserByID(r.Context(), sessionRec.UserID)
	if err != nil {
		jsonError(w, "invalid credentials", http.StatusUnauthorized)
		return
	}
	waUser, err := s.loadWebAuthnUser(r.Context(), user)
	if err != nil {
		jsonError(w, "internal error", http.StatusInternalServerError)
		return
	}
	var sessionData webauthn.SessionData
	if err := json.Unmarshal([]byte(sessionRec.DataJSON), &sessionData); err != nil {
		jsonError(w, "invalid session data", http.StatusInternalServerError)
		return
	}
	parsed, err := protocol.ParseCredentialRequestResponseBytes(req.Credential)
	if err != nil {
		jsonError(w, "invalid credential response", http.StatusBadRequest)
		return
	}
	credential, err := s.passkey.ValidateLogin(waUser, sessionData, parsed)
	if err != nil {
		jsonError(w, "passkey verification failed", http.StatusUnauthorized)
		return
	}
	credRaw, err := json.Marshal(credential)
	if err != nil {
		jsonError(w, "internal error", http.StatusInternalServerError)
		return
	}
	now := time.Now().UTC()
	if err := s.db.UpdateWebAuthnCredential(r.Context(), &models.WebAuthnCredential{
		UserID:       user.ID,
		CredentialID: base64.RawURLEncoding.EncodeToString(credential.ID),
		DataJSON:     string(credRaw),
		LastUsedAt:   &now,
	}); err != nil {
		slog.Warn("update webauthn credential", "error", err, "user_id", user.ID)
	}

	jwtToken, err := s.authSvc.GenerateToken(user.ID, user.Username)
	if err != nil {
		jsonError(w, "internal error", http.StatusInternalServerError)
		return
	}
	jsonResponse(w, http.StatusOK, tokenResponse{Token: jwtToken, User: user})
}

type webAuthnUser struct {
	user        *models.User
	credentials []webauthn.Credential
}

func (u *webAuthnUser) WebAuthnID() []byte {
	return []byte(strconv.FormatInt(u.user.ID, 10))
}

func (u *webAuthnUser) WebAuthnName() string {
	return u.user.Username
}

func (u *webAuthnUser) WebAuthnDisplayName() string {
	return u.user.Username
}

func (u *webAuthnUser) WebAuthnCredentials() []webauthn.Credential {
	return u.credentials
}

func (s *Server) loadWebAuthnUser(ctx context.Context, user *models.User) (*webAuthnUser, error) {
	rows, err := s.db.ListWebAuthnCredentials(ctx, user.ID)
	if err != nil {
		return nil, err
	}
	creds := make([]webauthn.Credential, 0, len(rows))
	for _, row := range rows {
		var c webauthn.Credential
		if err := json.Unmarshal([]byte(row.DataJSON), &c); err != nil {
			return nil, fmt.Errorf("decode webauthn credential %s: %w", row.CredentialID, err)
		}
		creds = append(creds, c)
	}
	return &webAuthnUser{user: user, credentials: creds}, nil
}

func randomToken(n int) (string, error) {
	b := make([]byte, n)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return base64.RawURLEncoding.EncodeToString(b), nil
}

func sha256Hex(value string) string {
	sum := sha256.Sum256([]byte(value))
	return hex.EncodeToString(sum[:])
}

func decodeBase64(value string) ([]byte, error) {
	decoders := []*base64.Encoding{
		base64.StdEncoding,
		base64.RawStdEncoding,
		base64.URLEncoding,
		base64.RawURLEncoding,
	}
	for _, enc := range decoders {
		if out, err := enc.DecodeString(value); err == nil {
			return out, nil
		}
	}
	return nil, fmt.Errorf("invalid base64 input")
}

func normalizeBootstrapTokenTTL(ttlSeconds int) time.Duration {
	if ttlSeconds <= 0 {
		return sshBootstrapTokenDefault
	}
	ttl := time.Duration(ttlSeconds) * time.Second
	if ttl < sshBootstrapTokenMinTTL {
		return sshBootstrapTokenMinTTL
	}
	if ttl > sshBootstrapTokenMaxTTL {
		return sshBootstrapTokenMaxTTL
	}
	return ttl
}

func mintSSHBootstrapToken(secret string, userID int64, username string, expiresAt time.Time) (string, error) {
	secret = strings.TrimSpace(secret)
	username = strings.TrimSpace(username)
	if secret == "" || userID <= 0 || username == "" || expiresAt.IsZero() {
		return "", fmt.Errorf("invalid bootstrap token mint input")
	}
	nonce, err := randomToken(16)
	if err != nil {
		return "", err
	}
	payload := sshBootstrapTokenPayload{
		Version:  sshBootstrapTokenVersion,
		UserID:   userID,
		Username: username,
		Expires:  expiresAt.UTC().Unix(),
		Nonce:    nonce,
	}
	rawPayload, err := json.Marshal(payload)
	if err != nil {
		return "", err
	}

	mac := hmac.New(sha256.New, []byte(secret))
	mac.Write(rawPayload)
	sig := mac.Sum(nil)
	return base64.RawURLEncoding.EncodeToString(rawPayload) + "." + base64.RawURLEncoding.EncodeToString(sig), nil
}

func verifySSHBootstrapToken(token, secret string, now time.Time) (*sshBootstrapTokenPayload, error) {
	token = strings.TrimSpace(token)
	secret = strings.TrimSpace(secret)
	if token == "" || secret == "" {
		return nil, fmt.Errorf("token and secret are required")
	}
	parts := strings.Split(token, ".")
	if len(parts) != 2 {
		return nil, fmt.Errorf("invalid token format")
	}
	rawPayload, err := base64.RawURLEncoding.DecodeString(parts[0])
	if err != nil {
		return nil, fmt.Errorf("invalid token payload encoding")
	}
	sig, err := base64.RawURLEncoding.DecodeString(parts[1])
	if err != nil {
		return nil, fmt.Errorf("invalid token signature encoding")
	}
	mac := hmac.New(sha256.New, []byte(secret))
	mac.Write(rawPayload)
	expectedSig := mac.Sum(nil)
	if !hmac.Equal(sig, expectedSig) {
		return nil, fmt.Errorf("invalid token signature")
	}
	var payload sshBootstrapTokenPayload
	if err := json.Unmarshal(rawPayload, &payload); err != nil {
		return nil, fmt.Errorf("invalid token payload")
	}
	if payload.Version != sshBootstrapTokenVersion {
		return nil, fmt.Errorf("unsupported token version")
	}
	if payload.UserID <= 0 || strings.TrimSpace(payload.Username) == "" || payload.Expires <= 0 {
		return nil, fmt.Errorf("invalid token payload")
	}
	if now.UTC().After(time.Unix(payload.Expires, 0).UTC()) {
		return nil, fmt.Errorf("token expired")
	}
	return &payload, nil
}
