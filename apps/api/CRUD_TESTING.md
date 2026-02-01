# Wizard & Page CRUD API - Testing Guide

This guide shows how to test the Builder UI CRUD endpoints for creating, reading, updating, and listing wizard and page drafts.

## Prerequisites

1. Start the database:
   ```bash
   pnpm db:up
   ```

2. Start the API:
   ```bash
   cd apps/api
   .venv/Scripts/activate
   python -m vsb_api.main
   ```

   Or use: `pnpm api:dev`

## Wizard Endpoints

### Create a Wizard Draft

**Endpoint:** `POST /api/wizards`

```bash
# Create JSON file
cat > wizard.json << 'EOF'
{
  "wizard_key": "travel-insurance-uk",
  "definition": {
    "title": "Travel Insurance",
    "pages": ["selectPlan", "details", "payment"]
  },
  "created_by": "test-user"
}
EOF

# Create wizard
curl -X POST http://localhost:8000/api/wizards \
  -H "Content-Type: application/json" \
  -d @wizard.json | python -m json.tool
```

**Response:**
```json
{
  "id": "bb4783bb-9aa3-477e-a06c-4fa048a18753",
  "wizard_key": "travel-insurance-uk",
  "version": "draft",
  "status": "draft",
  "schema_version": "wizard.v1",
  "definition": {
    "title": "Travel Insurance",
    "pages": ["selectPlan", "details", "payment"]
  },
  "checksum": "829360e3987af2af45f44a71b88b688ad090886e98952bce086f8559fdac27cb",
  "created_by": "test-user",
  "created_at": "2026-02-01T18:49:55.835306Z",
  "published_at": null
}
```

### Get a Wizard Draft

**Endpoint:** `GET /api/wizards/{wizard_key}/draft`

```bash
curl http://localhost:8000/api/wizards/travel-insurance-uk/draft | python -m json.tool
```

### Update a Wizard Draft

**Endpoint:** `PUT /api/wizards/{wizard_key}/draft`

```bash
# Create update JSON
cat > wizard_update.json << 'EOF'
{
  "definition": {
    "title": "Travel Insurance (Updated)",
    "pages": ["selectPlan", "personalDetails", "travelDetails", "payment"],
    "version": "2.0"
  },
  "created_by": "test-user"
}
EOF

# Update wizard
curl -X PUT http://localhost:8000/api/wizards/travel-insurance-uk/draft \
  -H "Content-Type: application/json" \
  -d @wizard_update.json | python -m json.tool
```

**Response:**
- Same structure as GET
- `definition` is updated
- `checksum` is automatically recalculated
- Same `id` (not a new record)

### List All Wizard Drafts

**Endpoint:** `GET /api/wizards`

```bash
# List only drafts
curl http://localhost:8000/api/wizards | python -m json.tool

# List all wizards (including published)
curl "http://localhost:8000/api/wizards?include_published=true" | python -m json.tool
```

### Delete a Wizard Draft

**Endpoint:** `DELETE /api/wizards/{wizard_key}/draft`

```bash
curl -X DELETE http://localhost:8000/api/wizards/travel-insurance-uk/draft
```

**Response:** `204 No Content`

## Page Endpoints

### Create a Page Draft

**Endpoint:** `POST /api/pages`

```bash
# Create JSON file
cat > page.json << 'EOF'
{
  "page_key": "page.travel.selectPlan",
  "definition": {
    "type": "form",
    "fields": [
      {
        "name": "planType",
        "type": "select",
        "options": ["basic", "premium", "platinum"]
      }
    ]
  },
  "created_by": "test-user"
}
EOF

# Create page
curl -X POST http://localhost:8000/api/pages \
  -H "Content-Type: application/json" \
  -d @page.json | python -m json.tool
```

**Response:**
```json
{
  "id": "33b0fd83-d31a-4996-b203-0daf11947c73",
  "page_key": "page.travel.selectPlan",
  "version": "draft",
  "status": "draft",
  "schema_version": "page.v1",
  "definition": {
    "type": "form",
    "fields": [...]
  },
  "checksum": "4679372ba8ee1263e74a532b74e32f9cd89e6d3e4f38ab50ea67350169ec8743",
  "created_by": "test-user",
  "created_at": "2026-02-01T18:50:48.143479Z",
  "published_at": null
}
```

### Get a Page Draft

**Endpoint:** `GET /api/pages/{page_key}/draft`

```bash
curl http://localhost:8000/api/pages/page.travel.selectPlan/draft | python -m json.tool
```

### Update a Page Draft

**Endpoint:** `PUT /api/pages/{page_key}/draft`

```bash
# Create update JSON
cat > page_update.json << 'EOF'
{
  "definition": {
    "type": "form",
    "title": "Select Your Plan",
    "fields": [
      {
        "name": "planType",
        "type": "select",
        "label": "Plan Type",
        "options": ["basic", "premium", "platinum"]
      },
      {
        "name": "coverage",
        "type": "text",
        "label": "Coverage Amount"
      }
    ]
  },
  "created_by": "test-user"
}
EOF

# Update page
curl -X PUT http://localhost:8000/api/pages/page.travel.selectPlan/draft \
  -H "Content-Type: application/json" \
  -d @page_update.json | python -m json.tool
```

### List All Page Drafts

**Endpoint:** `GET /api/pages`

```bash
# List only drafts
curl http://localhost:8000/api/pages | python -m json.tool

# List all pages (including published)
curl "http://localhost:8000/api/pages?include_published=true" | python -m json.tool
```

### Delete a Page Draft

**Endpoint:** `DELETE /api/pages/{page_key}/draft`

```bash
curl -X DELETE http://localhost:8000/api/pages/page.travel.selectPlan/draft
```

**Response:** `204 No Content`

## Windows PowerShell Examples

If using PowerShell instead of bash:

```powershell
# Create wizard
$wizardJson = @{
    wizard_key = "travel-insurance-uk"
    definition = @{
        title = "Travel Insurance"
        pages = @("selectPlan", "details", "payment")
    }
    created_by = "test-user"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:8000/api/wizards" `
    -Method Post `
    -ContentType "application/json" `
    -Body $wizardJson

# Get wizard draft
Invoke-RestMethod -Uri "http://localhost:8000/api/wizards/travel-insurance-uk/draft"

# Update wizard draft
$updateJson = @{
    definition = @{
        title = "Travel Insurance (Updated)"
        pages = @("selectPlan", "personalDetails", "payment")
    }
    created_by = "test-user"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:8000/api/wizards/travel-insurance-uk/draft" `
    -Method Put `
    -ContentType "application/json" `
    -Body $updateJson

# List all wizards
Invoke-RestMethod -Uri "http://localhost:8000/api/wizards"
```

## Key Features

### Automatic Checksums
- Every definition gets a SHA-256 checksum
- Checksums are recalculated automatically on updates
- Used for immutability verification

### Draft vs Published
- All creates/updates go to `version='draft'` and `status='draft'`
- Drafts can be modified freely
- Published versions would be immutable (publishing not yet implemented)

### Unique Constraints
- Each `wizard_key` can only have ONE draft
- Each `page_key` can only have ONE draft
- Attempting to create a duplicate draft returns `409 Conflict`

### Error Responses

**404 Not Found** - Draft doesn't exist:
```json
{
  "detail": "No draft found for wizard_key 'unknown-wizard'"
}
```

**409 Conflict** - Draft already exists:
```json
{
  "detail": "Draft already exists for wizard_key 'travel-insurance-uk'. Use PUT to update."
}
```

## Database Verification

Check that data is persisted:

```bash
# Check wizards
docker exec visual-studio-postgres-1 psql -U vsb -d vsb \
  -c "SELECT wizard_key, version, status, created_by FROM wizard_definitions;"

# Check pages
docker exec visual-studio-postgres-1 psql -U vsb -d vsb \
  -c "SELECT page_key, version, status, created_by FROM page_definitions;"

# View full wizard definition
docker exec visual-studio-postgres-1 psql -U vsb -d vsb \
  -c "SELECT wizard_key, definition FROM wizard_definitions WHERE wizard_key='travel-insurance-uk';"
```

## API Documentation

Interactive API docs available at:
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc
