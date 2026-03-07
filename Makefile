.PHONY: all build frontend embed clean validate-up validate-smoke validate-all validate-down validate-ps validate-logs

all: build

# Build frontend
frontend:
	cd frontend && npm run build

# Copy frontend dist into Go embed directory
embed: frontend
	rm -rf internal/web/dist
	cp -r frontend/dist internal/web/dist

# Build the orchard binary (requires embed step first)
build: embed
	go build -o orchard ./cmd/orchard

clean:
	rm -rf orchard frontend/dist internal/web/dist

validate-up:
	./scripts/validate-isolated.sh up

validate-smoke:
	./scripts/validate-isolated.sh smoke

validate-all:
	./scripts/validate-isolated.sh all

validate-down:
	./scripts/validate-isolated.sh down

validate-ps:
	./scripts/validate-isolated.sh ps

validate-logs:
	./scripts/validate-isolated.sh logs
