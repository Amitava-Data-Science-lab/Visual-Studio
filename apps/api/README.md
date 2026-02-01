# Visual Studio Builder API

FastAPI backend for the Visual Studio Builder platform.

## Database Setup

### Development Mode

For local development, the API can automatically create tables and indexes on startup:

```bash
# Set in .env
DEV_MODE=true

# Start API (will auto-create schema)
python -m vsb_api.main
```

### Production Mode (Recommended)

For production deployments, use Alembic migrations:

```bash
# Set in .env
DEV_MODE=false

# Run migrations
alembic upgrade head

# Start API
python -m vsb_api.main
```

## Getting Started

### 1. Install Dependencies

```bash
cd apps/api
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
pip install -e .
```

### 2. Start PostgreSQL

```bash
# From project root
pnpm db:up
```

The Docker PostgreSQL instance runs on port **5433** (not 5432) to avoid conflicts with local PostgreSQL installations.

### 3. Run Migrations

```bash
cd apps/api
alembic upgrade head
```

### 4. Start API

```bash
python -m vsb_api.main
```

The API will be available at:
- Main API: http://localhost:8000
- API Docs: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## Database Migrations

### Create a New Migration

After making changes to models:

```bash
cd apps/api
alembic revision --autogenerate -m "Description of changes"
```

### Apply Migrations

```bash
alembic upgrade head
```

### Rollback Migration

```bash
# Rollback one revision
alembic downgrade -1

# Rollback to specific revision
alembic downgrade <revision_id>
```

### View Migration History

```bash
alembic history
```

### View Current Revision

```bash
alembic current
```

## Health Checks

The API provides several health check endpoints:

### Basic Health
```bash
curl http://localhost:8000/health
```
Returns: `{"status": "healthy", "service": "vsb-api"}`

### Readiness (with DB check)
```bash
curl http://localhost:8000/health/ready
```
Returns: `{"status": "ready", "database": "connected"}`

Returns **503 Service Unavailable** if database is down.

### Liveness
```bash
curl http://localhost:8000/health/live
```
Returns: `{"status": "alive"}`

### Database Health (detailed)
```bash
curl http://localhost:8000/health/db
```
Returns detailed database status including:
- Connection status
- Table count
- Migration status
- Current migration version

## Database Schema

The API uses 7 main tables:

1. **wizard_definitions** - Versioned wizard definitions
2. **page_definitions** - Versioned page definitions
3. **wizard_releases** - Release pointers for deployments
4. **wizard_sessions** - Runtime session tracking
5. **quotes** - Insurance quotes
6. **policies** - Issued policies
7. **audit_events** - Comprehensive audit trail

## Environment Variables

See `.env.example` for all available configuration options:

- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET` - Secret for JWT tokens
- `DEV_MODE` - Enable development mode (auto schema creation)
- `DEBUG` - Enable debug logging

## API Routes

### Health
- `GET /health` - Basic health check
- `GET /health/ready` - Readiness check (includes DB)
- `GET /health/live` - Liveness check
- `GET /health/db` - Detailed database health

### Wizards
- `GET /api/wizards` - List all wizards
- `POST /api/wizards` - Create a wizard
- `GET /api/wizards/{id}` - Get a wizard
- `PUT /api/wizards/{id}` - Update a wizard
- `DELETE /api/wizards/{id}` - Delete a wizard
- `POST /api/wizards/{id}/publish` - Publish a wizard version
- `GET /api/wizards/{id}/versions` - List wizard versions

### Pages
- `GET /api/pages` - List all pages
- `POST /api/pages` - Create a page
- `GET /api/pages/{id}` - Get a page
- `PUT /api/pages/{id}` - Update a page
- `DELETE /api/pages/{id}` - Delete a page
- `POST /api/pages/{id}/publish` - Publish a page version
- `GET /api/pages/{id}/versions` - List page versions

### Runtime (Embedded)
- `GET /api/embedded/wizards/{id}` - Get published wizard for runtime
- `GET /api/embedded/wizards/{id}/versions/{version}` - Get specific version
- `POST /api/embedded/sessions` - Create a session
- `GET /api/embedded/sessions/{id}` - Get session
- `POST /api/embedded/sessions/{id}/prefill` - Prefill session data
- `POST /api/embedded/sessions/{id}/quote` - Get a quote
- `POST /api/embedded/sessions/{id}/accept` - Accept a quote
- `POST /api/embedded/sessions/{id}/issue` - Issue policy

## Development Workflow

1. Make changes to models in `src/vsb_api/models/`
2. Create migration: `alembic revision --autogenerate -m "description"`
3. Review generated migration in `alembic/versions/`
4. Apply migration: `alembic upgrade head`
5. Test changes
6. Commit migration files with code changes

## Production Deployment

1. Build Docker image with migrations
2. Run migrations before starting app:
   ```bash
   alembic upgrade head
   ```
3. Start application:
   ```bash
   uvicorn vsb_api.main:app --host 0.0.0.0 --port 8000
   ```
4. Health checks will verify DB connectivity

## Troubleshooting

### Database Connection Failed

```bash
# Check if PostgreSQL is running
docker ps

# Start database
pnpm db:up

# Verify connection (Docker instance on port 5433)
psql -U vsb -d vsb -h localhost -p 5433
```

### Migration Errors

```bash
# Check current migration status
alembic current

# View migration history
alembic history

# Manually inspect database
psql -U vsb -d vsb -h localhost -p 5433 -c "SELECT * FROM alembic_version;"
```

### Reset Database (Development Only)

```bash
# Drop all tables and recreate
psql -U vsb -d vsb -h localhost -p 5433 -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
alembic upgrade head
```

## Testing

```bash
# Install dev dependencies
pip install -e ".[dev]"

# Run tests
pytest

# Run with coverage
pytest --cov=vsb_api
```
