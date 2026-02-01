# Visual Studio Builder

A production-grade monorepo for building schema-driven wizards with an embedded runtime and Python API.

## Tech Stack

- **pnpm workspaces** - Fast, clean package management
- **Turborepo** - Build caching and pipelines
- **React + TypeScript** - Builder & Runtime UIs
- **FastAPI + Pydantic** - Backend validation and orchestration
- **PostgreSQL** - Versioned definitions with JSONB

## Quick Start

### 1. Install dependencies

```bash
pnpm install
```

### 2. Start the database

```bash
pnpm db:up
```

### 3. Run all services

```bash
pnpm dev
```

Or run individually:

```bash
pnpm api:dev      # FastAPI backend (port 8000)
pnpm builder:dev  # Builder UI (port 3000)
pnpm runtime:dev  # Runtime UI (port 3001)
```

## Project Structure

```
visual-studio-builder/
├── apps/
│   ├── builder-ui/     # Schema-driven wizard editor
│   ├── runtime-ui/     # Embeddable wizard runner
│   └── api/            # FastAPI backend
├── packages/
│   ├── schemas/        # Source-of-truth JSON schemas
│   ├── sdk/            # Shared TS types & helpers
│   ├── ui/             # Shared UI components
│   └── config/         # Shared lint/ts configs
├── docker/             # Docker configurations
└── tooling/            # Build scripts
```

## Architecture

**Builder UI** → Edit and save wizard/page definitions
**API** → Store drafts, validate on publish, create immutable versions
**Runtime UI** → Load and render published wizards

## Environment Variables

Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
```

## License

MIT
