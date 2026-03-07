package api

import (
	"net/http"
	"strings"
)

func (s *Server) handleAuthCapabilities(w http.ResponseWriter, r *http.Request) {
	bootstrapEnabled := strings.TrimSpace(s.bootstrapSSHToken) != ""
	jsonResponse(w, http.StatusOK, map[string]any{
		"magic_link_enabled":         true,
		"ssh_auth_enabled":           true,
		"ssh_bootstrap_enabled":      bootstrapEnabled,
		"ssh_bootstrap_mint_enabled": bootstrapEnabled,
		"passkey_enabled":            s.passkey != nil,
		"organizations_enabled":      s.enableOrganizations,
		"require_verified_email":     s.requireVerifiedEmail,
		"require_passkey_enrollment": s.requirePasskeyEnrollment,
	})
}
