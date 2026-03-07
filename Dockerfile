# Build WASM + Go binary (frontend is built separately)
FROM golang:1.25-alpine AS builder
RUN apk add --no-cache make
WORKDIR /app
ARG WASM_GO_TAGS=grammar_set_core
COPY go.mod go.sum ./
RUN go mod download
COPY . .
# Build binary (frontend served by Next.js service in production)
RUN CGO_ENABLED=0 go build -ldflags="-s -w" -o /orchard ./cmd/orchard

# Minimal runtime
FROM alpine:3.20
RUN apk add --no-cache ca-certificates
COPY --from=builder /orchard /usr/local/bin/orchard
EXPOSE 3000
ENTRYPOINT ["orchard"]
CMD ["serve"]
