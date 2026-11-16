.PHONY: run seed test build docker-up docker-down

run:
	go run cmd/server/main.go

seed:
	go run cmd/seed/main.go

test:
	go test -v ./...

build:
	go build -o bin/server cmd/server/main.go
	go build -o bin/seed cmd/seed/main.go

docker-up:
	docker-compose up -d --build

docker-down:
	docker-compose down
