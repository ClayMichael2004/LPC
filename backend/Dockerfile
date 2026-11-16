# Multi-stage Docker build for Little Polo Cafe backend
FROM golang:1.24-alpine AS builder

WORKDIR /app

RUN apk add --no-cache git ca-certificates tzdata

COPY go.mod go.sum ./
RUN go mod download

COPY . .

RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -ldflags="-w -s" -o /app/lpc-server ./cmd/server
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -ldflags="-w -s" -o /app/lpc-seed ./cmd/seed

FROM alpine:3.20

WORKDIR /app

RUN apk add --no-cache ca-certificates tzdata
ENV TZ=Africa/Nairobi

COPY --from=builder /app/lpc-server /app/lpc-server
COPY --from=builder /app/lpc-seed /app/lpc-seed
COPY --from=builder /app/migrations /app/migrations

EXPOSE 8080

CMD ["/app/lpc-server"]
