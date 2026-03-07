# orchard

AI-first code hosting with structural diffs, structural merge preview, entity lineage, and built-in code intelligence.

Contributor workflow: see [CONTRIBUTING.md](CONTRIBUTING.md).

## Stack provenance

- [graft](https://github.com/odvcencio/graft): structural VCS client — object model, merge engine, and entity-aware CLI.
- [gotreesitter](https://github.com/odvcencio/gotreesitter): pure-Go parser/runtime powering entity extraction and syntax intelligence.
- [gts-suite](https://github.com/odvcencio/gts-suite): structural indexing and analysis tooling consumed by orchard services.

## Architecture

Two services:

| Service | Port | Role |
|---------|------|------|
| `orchard` | 3000 | Go API + graft protocol server |
| `frontend` | 3001 | Next.js 15 web UI |

## Quick start (Docker)

```bash
cp .env.example .env
docker compose up --build
```

Open `http://localhost:3001`.

The API is at `http://localhost:3000`. Default compose settings enable passwordless auth flows (magic link, passkey, SSH) and set a dev JWT secret that passes boot validation (`>=16` chars and not `change-me-in-production`). Change these values before any shared deployment.

## Isolated validation (container sandbox, memory-capped)

Use this when validating unstable gotreesitter/graft changes so parser regressions cannot OOM your main stack.

- Starts a separate stack on:
  - API: `http://127.0.0.1:3110`
  - Web: `http://127.0.0.1:3111`
- Runs services with CPU/memory limits via `docker-compose.validate.yml`.
- Uses separate persistent data volume (`validate-repo-data`).

Commands:

```bash
# build + start isolated stack
make validate-up

# run end-to-end smoke checks:
# register -> create repo -> git push/clone -> diff/semver/entities -> compare page
make validate-smoke

# one-shot bring-up + smoke
make validate-all

# inspect / teardown
make validate-ps
make validate-logs
make validate-down
```

Reset isolated data fully:

```bash
./scripts/validate-isolated.sh down --volumes
```

Note: if frontend image build cannot reach Google Fonts in your Docker network, the script still runs API-only isolation and smoke checks on `:3110`.

## Requirements

- Go 1.25+
- Node.js 22+ and npm (frontend)

## CI checks

- Backend unit/integration tests: `go test ./...`
- Backend vulnerability scan: `govulncheck ./...`
- Frontend lint/build: `cd frontend && npm run lint && npm run build`
- Postgres migration smoke test: `go run ./cmd/orchard migrate` (run twice for idempotency)

## Quick start (local)

Run the API and frontend in separate terminals:

```bash
# Terminal 1 — API
ORCHARD_JWT_SECRET=dev-jwt-secret-change-this \
ORCHARD_CORS_ALLOW_ORIGINS=http://localhost:3001 \
ORCHARD_WEBAUTHN_ORIGIN=http://localhost:3001 \
go run ./cmd/orchard serve

# Terminal 2 — frontend dev server
cd frontend && npm ci && npm run dev
```

Open `http://localhost:3001`. The dev server proxies API calls to port 3000.

## Environment variables

All runtime env vars use the `ORCHARD_` prefix; legacy `GOTHUB_` names are no longer read.

### Core

- `ORCHARD_HOST`: bind host (default `0.0.0.0`)
- `ORCHARD_PORT`: bind port (default `3000`)
- `ORCHARD_DB_DRIVER`: `sqlite` or `postgres` (default `sqlite`)
- `ORCHARD_DB_DSN`: DB DSN/file path
- `ORCHARD_STORAGE_PATH`: repository storage root
- `ORCHARD_JWT_SECRET`: JWT signing secret (required; at least 16 chars)
- `ORCHARD_REQUIRE_VERIFIED_EMAIL`: require magic-link email verification before write actions (`true`/`false`)
- `ORCHARD_REQUIRE_PASSKEY_ENROLLMENT`: require at least one registered passkey before write actions (`true`/`false`)
- `ORCHARD_ENABLE_ORGANIZATIONS`: enable organization APIs/routes (default `false`)
- `ORCHARD_BOOTSTRAP_SSH_TOKEN`: optional signing secret that enables first-key SSH bootstrap token minting (`POST /api/v1/auth/ssh/bootstrap/token`) and validation (`POST /api/v1/auth/ssh/bootstrap`)

### Auth/WebAuthn

- `ORCHARD_WEBAUTHN_ORIGIN`: RP origin (for passkeys)
- `ORCHARD_WEBAUTHN_RPID`: RP ID (for passkeys)
- Magic-link and SSH auth do not require extra environment variables in local/dev mode.
- First-key SSH bootstrap for headless agents can be enabled with `ORCHARD_BOOTSTRAP_SSH_TOKEN`.
- Bootstrap tokens are short-lived and minted per request by authenticated users via `POST /api/v1/auth/ssh/bootstrap/token`.

## Development notes

- Orchard uses passwordless auth flows (magic link, passkey, SSH).
- Magic-link auth is available in local/dev mode without external email delivery (token returned/logged for dev flows).
- Passkeys require properly configured origin/RP ID and browser support. For local UI on `http://localhost:3001`, set `ORCHARD_WEBAUTHN_ORIGIN=http://localhost:3001`.
- The frontend dev server (`npm run dev`) runs on port 3001 and expects the API on port 3000. Set `ORCHARD_CORS_ALLOW_ORIGINS=http://localhost:3001` on the API when running locally.
- Syntax highlighting and entity extraction are computed server-side and returned inline from the blob API.

## License

MIT
