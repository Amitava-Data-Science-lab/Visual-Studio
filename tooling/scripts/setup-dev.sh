#!/bin/bash
#
# Development environment setup script
#
# Usage: ./tooling/scripts/setup-dev.sh
#

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"

cd "$ROOT_DIR"

echo "=========================================="
echo "Visual Studio Builder - Development Setup"
echo "=========================================="
echo ""

# Check for required tools
echo "Checking required tools..."

check_command() {
  if ! command -v "$1" &> /dev/null; then
    echo "ERROR: $1 is required but not installed."
    exit 1
  fi
  echo "  ✓ $1"
}

check_command "node"
check_command "pnpm"
check_command "docker"
check_command "python3"

echo ""

# Install Node.js dependencies
echo "Installing Node.js dependencies..."
pnpm install

echo ""

# Set up Python virtual environment
echo "Setting up Python virtual environment..."
cd "$ROOT_DIR/apps/api"

if [ ! -d ".venv" ]; then
  python3 -m venv .venv
fi

source .venv/bin/activate || source .venv/Scripts/activate
pip install -e ".[dev]"

cd "$ROOT_DIR"

echo ""

# Create .env if it doesn't exist
if [ ! -f ".env" ]; then
  echo "Creating .env from .env.example..."
  cp .env.example .env
fi

echo ""

# Start database
echo "Starting PostgreSQL database..."
docker compose up -d

echo ""
echo "=========================================="
echo "Setup complete!"
echo ""
echo "To start development:"
echo "  pnpm dev          # Start all services"
echo ""
echo "Or start individually:"
echo "  pnpm db:up        # Start database"
echo "  pnpm api:dev      # Start API (port 8000)"
echo "  pnpm builder:dev  # Start Builder UI (port 3000)"
echo "  pnpm runtime:dev  # Start Runtime UI (port 3001)"
echo "=========================================="
