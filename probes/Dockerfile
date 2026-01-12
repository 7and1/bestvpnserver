FROM golang:1.22-alpine AS builder

WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download

COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -o probe ./cmd/probe

FROM alpine:3.19

RUN apk add --no-cache \
    openvpn \
    wireguard-tools \
    ca-certificates \
    curl

COPY --from=builder /app/probe /usr/local/bin/probe

HEALTHCHECK --interval=30s --timeout=3s \
    CMD curl -f http://localhost:8080/health || exit 1

ENTRYPOINT ["probe"]
