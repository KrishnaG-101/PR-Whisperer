.PHONY: all help install test test-backend test-frontend dev docker-up docker-down docker-logs incident-drill clean

# Default Target
all: help

help:
	@echo "PR-Whisperer - Operational Commands"
	@echo "================================================================"
	@echo "  make install         Install backend and frontend dependencies"
	@echo "  make test            Run both backend pytest and frontend vitest"
	@echo "  make test-backend    Run pytest suite with coverage"
	@echo "  make test-frontend   Run vitest component suite"
	@echo "  make dev             Start local backend (:8000) and frontend (:5173)"
	@echo "  make docker-up       Launch full stack via Docker Compose"
	@echo "  make docker-down     Stop and clean Docker Compose containers"
	@echo "  make docker-logs     Follow Docker Compose container logs"
	@echo "  make incident-drill  Run automated incident drill & on-call test"
	@echo "  make clean           Clean cache files and build artifacts"

install:
	pip install -r backend/requirements.txt
	cd frontend && npm install

test: test-backend test-frontend

test-backend:
	pytest tests/ -v --cov=backend/app --cov-report=term-missing

test-frontend:
	cd frontend && npm test -- --run

dev:
	@echo "Starting PR-Whisperer FastAPI backend and React frontend..."
	python -m uvicorn backend.app.main:app --host 0.0.0.0 --port 8000 --reload & cd frontend && npm run dev

docker-up:
	docker compose up --build

docker-down:
	docker compose down -v

docker-logs:
	docker compose logs -f

incident-drill:
	bash incident-response/test-incident.sh

clean:
	rm -rf frontend/dist frontend/node_modules/.vite .pytest_cache .coverage
	find . -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true
