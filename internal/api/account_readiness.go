package api

import (
	"context"
	"net/http"
	"strings"
)

func (s *Server) accountOnboardingStatus(ctx context.Context, userID int64) (ready bool, reasons []string, err error) {
	reasons = make([]string, 0, 2)

	if s.requireVerifiedEmail {
		verified, verifyErr := s.db.HasVerifiedEmail(ctx, userID)
		if verifyErr != nil {
			return false, nil, verifyErr
		}
		if !verified {
			reasons = append(reasons, "email verification required")
		}
	}

	if s.requirePasskeyEnrollment {
		hasPasskey, passkeyErr := s.db.HasWebAuthnCredential(ctx, userID)
		if passkeyErr != nil {
			return false, nil, passkeyErr
		}
		if !hasPasskey {
			reasons = append(reasons, "passkey registration required")
		}
	}

	return len(reasons) == 0, reasons, nil
}

func (s *Server) ensureAccountOnboarding(w http.ResponseWriter, r *http.Request, userID int64) bool {
	ready, reasons, err := s.accountOnboardingStatus(r.Context(), userID)
	if err != nil {
		jsonError(w, "internal error", http.StatusInternalServerError)
		return false
	}
	if ready {
		return true
	}
	jsonResponse(w, http.StatusForbidden, map[string]any{
		"error":   "account onboarding incomplete",
		"reasons": reasons,
	})
	return false
}

func formatOnboardingReasons(reasons []string) string {
	if len(reasons) == 0 {
		return "account onboarding incomplete"
	}
	return "account onboarding incomplete: " + strings.Join(reasons, ", ")
}
