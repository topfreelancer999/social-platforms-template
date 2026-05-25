.PHONY: run dev redis docker seed-export tidy build

run:
	go run ./cmd/server

dev: redis
	$(MAKE) run

redis:
	docker compose up -d redis

docker:
	docker compose up --build

seed-export:
	cd ../linkedin && npx tsx scripts/export-seed.mjs
	cp data/seed.json internal/store/seed.json

tidy:
	go mod tidy

build:
	go build -o bin/server ./cmd/server
