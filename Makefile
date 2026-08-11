.PHONY: help start start-backend start-frontend install install-backend install-frontend \
        test test-backend test-e2e lint build docker docker-hold stop

# Default target
help:
	@echo "Galaxium Travels -- available targets:"
	@echo ""
	@echo "  make start            Start backend + frontend (+ Java hold service if available)"
	@echo "  make start-backend    Start only the Python/FastAPI backend (port 8001)"
	@echo "  make start-frontend   Start only the React/Vite frontend (port 5173)"
	@echo ""
	@echo "  make install          Install all dependencies (Python + Node)"
	@echo "  make install-backend  Install Python dependencies"
	@echo "  make install-frontend Install Node dependencies"
	@echo ""
	@echo "  make test             Run the Python backend unit tests"
	@echo "  make test-e2e         Run the full e2e test suite (requires Docker)"
	@echo "  make lint             Lint the frontend"
	@echo "  make build            Build the frontend for production"
	@echo ""
	@echo "  make docker           Start full stack via Docker Compose"
	@echo "  make docker-hold      Start full stack + Java hold service via Docker Compose"
	@echo "  make stop             Stop all Docker Compose services"

# -- Local development --------------------------------------------------------

start:
	@./start.sh

start-backend: install-backend
	@echo "Starting backend on http://localhost:8001 ..."
	@cd booking_system_backend && .venv/bin/python server.py

start-frontend: install-frontend
	@echo "Starting frontend on http://localhost:5173 ..."
	@cd booking_system_frontend && npm run dev

# -- Dependency installation --------------------------------------------------

install: install-backend install-frontend

install-backend:
	@echo "Installing Python dependencies..."
	@cd booking_system_backend && \
		python3 -m venv .venv && \
		.venv/bin/pip install -q -r requirements.txt
	@echo "Done."

install-frontend:
	@echo "Installing Node dependencies..."
	@cd booking_system_frontend && npm install
	@echo "Done."

# -- Testing ------------------------------------------------------------------

test:
	@cd booking_system_backend && .venv/bin/python -m pytest

test-backend: test

test-e2e:
	@./test.sh

# -- Frontend quality ---------------------------------------------------------

lint:
	@cd booking_system_frontend && npm run lint

build:
	@cd booking_system_frontend && npm run build

# -- Docker -------------------------------------------------------------------

docker:
	@docker compose up --build

docker-hold:
	@docker compose --profile hold-service up --build

stop:
	@docker compose down
