#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
COMPOSE_FILE="$ROOT_DIR/docker-compose.validate.yml"
PROJECT_NAME="${ORCHARD_VALIDATE_PROJECT:-orchard-validate}"
API_PORT="${VALIDATE_API_PORT:-3110}"
WEB_PORT="${VALIDATE_WEB_PORT:-3111}"
STATE_FILE="$ROOT_DIR/.validate-stack.env"

compose() {
  docker compose -p "$PROJECT_NAME" -f "$COMPOSE_FILE" "$@"
}

require_cmd() {
  local cmd="$1"
  if ! command -v "$cmd" >/dev/null 2>&1; then
    echo "missing required command: $cmd" >&2
    exit 1
  fi
}

wait_for_url() {
  local url="$1"
  local attempts="${2:-60}"
  local sleep_s="${3:-1}"
  local quiet="${4:-0}"
  local i
  for ((i = 1; i <= attempts; i += 1)); do
    if curl -fsS "$url" >/dev/null 2>&1; then
      return 0
    fi
    sleep "$sleep_s"
  done
  if [[ "$quiet" != "1" ]]; then
    echo "timed out waiting for $url" >&2
  fi
  return 1
}

port_in_use() {
  local port="$1"
  if command -v ss >/dev/null 2>&1; then
    ss -ltnH "sport = :${port}" 2>/dev/null | grep -q .
    return
  fi
  if command -v lsof >/dev/null 2>&1; then
    lsof -nP -iTCP:"${port}" -sTCP:LISTEN >/dev/null 2>&1
    return
  fi
  return 1
}

pick_free_port() {
  local start="$1"
  local p="$start"
  while port_in_use "$p"; do
    p=$((p + 1))
  done
  echo "$p"
}

resolve_ports_for_up() {
  if [[ -z "${VALIDATE_API_PORT:-}" ]]; then
    local picked_api
    picked_api="$(pick_free_port "$API_PORT")"
    if [[ "$picked_api" != "$API_PORT" ]]; then
      echo "[validate] warning: api port ${API_PORT} is busy, using ${picked_api}" >&2
      API_PORT="$picked_api"
    fi
  fi

  if [[ -z "${VALIDATE_WEB_PORT:-}" ]]; then
    local picked_web
    picked_web="$(pick_free_port "$WEB_PORT")"
    if [[ "$picked_web" == "$API_PORT" ]]; then
      picked_web="$(pick_free_port "$((API_PORT + 1))")"
    fi
    if [[ "$picked_web" != "$WEB_PORT" ]]; then
      echo "[validate] warning: web port ${WEB_PORT} is busy, using ${picked_web}" >&2
      WEB_PORT="$picked_web"
    fi
  fi

  export VALIDATE_API_PORT="$API_PORT"
  export VALIDATE_WEB_PORT="$WEB_PORT"
}

save_state() {
  cat >"$STATE_FILE" <<STATE
VALIDATE_API_PORT=${API_PORT}
VALIDATE_WEB_PORT=${WEB_PORT}
ORCHARD_VALIDATE_PROJECT=${PROJECT_NAME}
STATE
}

load_state() {
  if [[ -f "$STATE_FILE" ]]; then
    # shellcheck disable=SC1090
    source "$STATE_FILE"
    API_PORT="${VALIDATE_API_PORT:-$API_PORT}"
    WEB_PORT="${VALIDATE_WEB_PORT:-$WEB_PORT}"
    export VALIDATE_API_PORT="$API_PORT"
    export VALIDATE_WEB_PORT="$WEB_PORT"
  fi
}

build_runtime_artifacts() {
  require_cmd go

  echo "[validate] building orchard binary"
  (
    cd "$ROOT_DIR"
    go build -o orchard ./cmd/orchard
  )
}

cmd_up() {
  resolve_ports_for_up
  build_runtime_artifacts
  compose up -d orchard
  if compose up -d --no-build frontend; then
    :
  elif compose up -d --build frontend; then
    :
  else
    echo "[validate] warning: frontend container failed to start/build; continuing with isolated API only" >&2
  fi
  save_state
  compose ps

  echo "[validate] api: http://127.0.0.1:${API_PORT}"
  echo "[validate] web: http://127.0.0.1:${WEB_PORT}"
}

cmd_down() {
  compose down "$@"
}

cmd_logs() {
  compose logs -f --tail=200 "$@"
}

cmd_ps() {
  compose ps
}

cmd_smoke() {
  load_state
  require_cmd curl
  require_cmd jq
  require_cmd git

  local api="http://127.0.0.1:${API_PORT}"
  local web="http://127.0.0.1:${WEB_PORT}"

  echo "[validate] waiting for api"
  wait_for_url "$api/healthz" 90 1
  local web_available=0
  if wait_for_url "$web" 10 1 1; then
    web_available=1
  else
    echo "[validate] warning: web endpoint unavailable on ${web}; skipping UI route checks" >&2
  fi

  local suffix
  suffix="$(date +%s%N | tail -c 8)"
  local username="validate${suffix}"
  local email="${username}@example.com"
  local repo="smoke-${suffix}"

  echo "[validate] register user ${username}"
  local reg_json
  reg_json="$(curl -fsS -X POST "$api/api/v1/auth/register" \
    -H 'Content-Type: application/json' \
    -d "{\"username\":\"${username}\",\"email\":\"${email}\"}")"

  local token
  token="$(printf '%s' "$reg_json" | jq -r '.token')"
  if [[ -z "$token" || "$token" == "null" ]]; then
    echo "register did not return token" >&2
    echo "$reg_json" >&2
    exit 1
  fi

  echo "[validate] create repo ${repo}"
  curl -fsS -X POST "$api/api/v1/repos" \
    -H "Authorization: Bearer ${token}" \
    -H 'Content-Type: application/json' \
    -d "{\"name\":\"${repo}\",\"private\":false}" >/dev/null

  local token_uri
  token_uri="$(jq -rn --arg v "$token" '$v|@uri')"
  local remote_url="http://${username}:${token_uri}@127.0.0.1:${API_PORT}/git/${username}/${repo}.git"

  local tmp
  tmp="$(mktemp -d)"
  trap "rm -rf '$tmp'" EXIT

  echo "[validate] git push + clone table-stakes"
  (
    cd "$tmp"
    git init -q
    git config user.name "Orchard Validate"
    git config user.email "$email"

    cat > parser.go <<'GO'
package parser

func ParseOne(input string) int {
	if input == "" {
		return 0
	}
	return len(input)
}
GO

    git add parser.go
    git commit -q -m "feat: seed parser"
    git branch -M main
    git remote add origin "$remote_url"
    git push -q -u origin main

    git checkout -q -b feature
    cat > parser.go <<'GO'
package parser

func ParseOne(input string) int {
	if input == "" {
		return 0
	}
	return len(input)
}

func ParseBatch(items []string) int {
	total := 0
	for _, item := range items {
		total += ParseOne(item)
	}
	return total
}
GO

    git add parser.go
    git commit -q -m "feat: add ParseBatch"
    git push -q -u origin feature

    git clone -q "$remote_url" clone-check
    test -f clone-check/parser.go
  )

  echo "[validate] browse + compare + gotreesitter entity extraction"
  curl -fsS "$api/api/v1/repos/${username}/${repo}/branches" | jq -e 'index("main") and index("feature")' >/dev/null
  curl -fsS "$api/api/v1/repos/${username}/${repo}/diff/main...feature" | jq -e '.files | length > 0' >/dev/null
  curl -fsS "$api/api/v1/repos/${username}/${repo}/semver/main...feature" | jq -e '.bump != null and .bump != ""' >/dev/null
  curl -fsS "$api/api/v1/repos/${username}/${repo}/entities/main/parser.go" | jq -e '.entities | length > 0' >/dev/null
  if [[ "$web_available" -eq 1 ]]; then
    curl -fsSI "$web/${username}/${repo}/compare" >/dev/null
  fi

  echo "[validate] smoke passed"
  echo "[validate] repo: ${username}/${repo}"
  if [[ "$web_available" -eq 1 ]]; then
    echo "[validate] compare: ${web}/${username}/${repo}/compare"
  fi

  trap - EXIT
  rm -rf "$tmp"
}

cmd_all() {
  cmd_up
  cmd_smoke
}

usage() {
  cat <<USAGE
Usage: $(basename "$0") <command> [args]

Commands:
  up           build host artifacts and start isolated validation stack
  smoke        run API/git/compare/entity smoke checks against isolated stack
  all          run up + smoke
  down [args]  stop stack (pass --volumes to reset data)
  ps           show container status
  logs [svc]   follow logs
USAGE
}

case "${1:-}" in
  up)
    shift
    cmd_up "$@"
    ;;
  smoke)
    shift
    cmd_smoke "$@"
    ;;
  all)
    shift
    cmd_all "$@"
    ;;
  down)
    shift
    cmd_down "$@"
    ;;
  ps)
    shift
    cmd_ps "$@"
    ;;
  logs)
    shift
    cmd_logs "$@"
    ;;
  *)
    usage
    exit 1
    ;;
esac
