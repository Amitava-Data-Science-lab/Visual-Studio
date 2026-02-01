# Wizard & Page Publishing - Testing Guide

This guide shows how to test the publishing workflow, including schema validation, referential integrity checks, and version management.

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

## Publishing Workflow Overview

```
Draft → Validate Schema → Check Referential Integrity → Publish to v1, v2, v3...
```

- **Drafts**: Mutable, can be edited freely (`version='draft'`, `status='draft'`)
- **Published**: Immutable versions (`version='v1'`, `status='published'`)
- **Auto-versioning**: v1, v2, v3... (auto-incremented)
- **Schema Validation**: All definitions validated against JSON schemas
- **Referential Integrity**: Wizard pageRefs must exist as published pages

## Test Scenarios

### Scenario 1: Basic Page Publishing

**1.1 Create a Page Draft**

```bash
# Create JSON file
cat > page.json << 'EOF'
{
  "page_key": "page.travel.selectPlan",
  "definition": {
    "fields": [
      {
        "id": "planType",
        "type": "select",
        "label": "Plan Type",
        "options": [
          {"value": "basic", "label": "Basic"},
          {"value": "premium", "label": "Premium"},
          {"value": "platinum", "label": "Platinum"}
        ]
      }
    ]
  },
  "created_by": "test-user"
}
EOF

curl -X POST http://localhost:8000/api/pages \
  -H "Content-Type: application/json" \
  -d @page.json | python -m json.tool
```

**Expected Response:**
```json
{
  "id": "...",
  "page_key": "page.travel.selectPlan",
  "version": "draft",
  "status": "draft",
  "schema_version": "page.v1",
  "definition": {...},
  "checksum": "...",
  "created_by": "test-user",
  "created_at": "...",
  "published_at": null
}
```

**1.2 Publish Page to v1**

```bash
curl -X POST http://localhost:8000/api/pages/page.travel.selectPlan/publish | python -m json.tool
```

**Expected Response:**
```json
{
  "page_key": "page.travel.selectPlan",
  "version": "v1",
  "status": "published",
  "published_at": "2026-02-01T...",
  "checksum": "..."
}
```

**1.3 Verify Draft Still Exists**

```bash
curl http://localhost:8000/api/pages/page.travel.selectPlan/draft | python -m json.tool
```

**Expected:** Draft remains unchanged (same ID, still status='draft')

### Scenario 2: Wizard Publishing with Page References

**2.1 Create Wizard Draft**

```bash
cat > wizard.json << 'EOF'
{
  "wizard_key": "travel-insurance-uk",
  "definition": {
    "steps": [
      {
        "id": "step1",
        "title": "Select Plan",
        "pageRef": "page.travel.selectPlan"
      }
    ]
  },
  "created_by": "test-user"
}
EOF

curl -X POST http://localhost:8000/api/wizards \
  -H "Content-Type: application/json" \
  -d @wizard.json | python -m json.tool
```

**2.2 Publish Wizard**

```bash
curl -X POST http://localhost:8000/api/wizards/travel-insurance-uk/publish | python -m json.tool
```

**Expected Response:**
```json
{
  "wizard_key": "travel-insurance-uk",
  "version": "v1",
  "status": "published",
  "published_at": "2026-02-01T...",
  "checksum": "..."
}
```

**What Happens:**
1. Loads draft
2. Validates against `wizard.v1.schema.json`
3. Checks that `page.travel.selectPlan` exists as published ✅
4. Determines next version (v1)
5. Creates new row with `version='v1'`, `status='published'`
6. Draft remains unchanged

### Scenario 3: Version Management

**3.1 Get Latest Published Version**

```bash
curl http://localhost:8000/api/wizards/travel-insurance-uk/latest | python -m json.tool
```

**Expected:** Returns v1 (or latest published version)

**3.2 Get Specific Version**

```bash
curl http://localhost:8000/api/wizards/travel-insurance-uk/versions/v1 | python -m json.tool
```

**Expected:** Returns v1 definition

**3.3 List All Versions**

```bash
curl http://localhost:8000/api/wizards/travel-insurance-uk/versions | python -m json.tool
```

**Expected:** Returns array with [v1, draft] (or [v2, v1, draft] if v2 exists)

### Scenario 4: Update and Republish

**4.1 Update Draft**

```bash
cat > wizard_update.json << 'EOF'
{
  "definition": {
    "steps": [
      {
        "id": "step1",
        "title": "Select Your Plan",
        "pageRef": "page.travel.selectPlan"
      },
      {
        "id": "step2",
        "title": "Summary",
        "fields": [
          {
            "id": "confirmation",
            "type": "checkbox",
            "label": "I confirm my selection"
          }
        ]
      }
    ]
  },
  "created_by": "test-user"
}
EOF

curl -X PUT http://localhost:8000/api/wizards/travel-insurance-uk/draft \
  -H "Content-Type: application/json" \
  -d @wizard_update.json | python -m json.tool
```

**Expected:** Draft updated with new checksum

**4.2 Republish to v2**

```bash
curl -X POST http://localhost:8000/api/wizards/travel-insurance-uk/publish | python -m json.tool
```

**Expected Response:**
```json
{
  "wizard_key": "travel-insurance-uk",
  "version": "v2",
  "status": "published",
  "published_at": "...",
  "checksum": "..."
}
```

**4.3 Verify Version History**

```bash
curl http://localhost:8000/api/wizards/travel-insurance-uk/versions | python -m json.tool
```

**Expected:** Returns [v2, v1, draft]

**4.4 Verify v1 Unchanged**

```bash
curl http://localhost:8000/api/wizards/travel-insurance-uk/versions/v1 | python -m json.tool
```

**Expected:** v1 has original definition (not updated)

### Scenario 5: Schema Validation Failure

**5.1 Create Page with Invalid Schema**

```bash
cat > bad_page.json << 'EOF'
{
  "page_key": "page.bad",
  "definition": {
    "fields": [
      {
        "id": "badField",
        "type": "select",
        "label": "Bad Field",
        "options": ["string1", "string2"]
      }
    ]
  }
}
EOF

curl -X POST http://localhost:8000/api/pages \
  -H "Content-Type: application/json" \
  -d @bad_page.json | python -m json.tool
```

**Expected:** Draft created (schema validation only happens on publish)

**5.2 Try to Publish**

```bash
curl -X POST http://localhost:8000/api/pages/page.bad/publish | python -m json.tool
```

**Expected Error:**
```json
{
  "detail": {
    "message": "Schema validation failed",
    "errors": [
      "Schema validation error at 'fields -> 0 -> options -> 0': 'string1' is not of type 'object'"
    ]
  }
}
```

**Why:** `options` must be array of objects with `{value, label}`, not strings

### Scenario 6: Referential Integrity Failure

**6.1 Create Wizard Referencing Non-existent Page**

```bash
cat > bad_wizard.json << 'EOF'
{
  "wizard_key": "bad-wizard",
  "definition": {
    "steps": [
      {
        "id": "step1",
        "title": "Bad Step",
        "pageRef": "page.nonexistent"
      }
    ]
  }
}
EOF

curl -X POST http://localhost:8000/api/wizards \
  -H "Content-Type: application/json" \
  -d @bad_wizard.json | python -m json.tool
```

**Expected:** Draft created (referential integrity only checked on publish)

**6.2 Try to Publish**

```bash
curl -X POST http://localhost:8000/api/wizards/bad-wizard/publish | python -m json.tool
```

**Expected Error:**
```json
{
  "detail": {
    "message": "Referential integrity check failed",
    "errors": [
      "Page reference 'page.nonexistent' not found or not published"
    ]
  }
}
```

### Scenario 7: Page Versioning

**7.1 Update and Republish Page**

```bash
cat > page_update.json << 'EOF'
{
  "definition": {
    "fields": [
      {
        "id": "planType",
        "type": "select",
        "label": "Plan Type",
        "options": [
          {"value": "basic", "label": "Basic"},
          {"value": "premium", "label": "Premium"},
          {"value": "platinum", "label": "Platinum"},
          {"value": "enterprise", "label": "Enterprise"}
        ]
      }
    ]
  },
  "created_by": "test-user"
}
EOF

curl -X PUT http://localhost:8000/api/pages/page.travel.selectPlan/draft \
  -H "Content-Type: application/json" \
  -d @page_update.json | python -m json.tool

curl -X POST http://localhost:8000/api/pages/page.travel.selectPlan/publish | python -m json.tool
```

**Expected:** Page published to v2

**7.2 List Page Versions**

```bash
curl http://localhost:8000/api/pages/page.travel.selectPlan/versions | python -m json.tool
```

**Expected:** Returns [v2, v1, draft]

## Windows PowerShell Examples

```powershell
# Create and publish page
$pageJson = @{
    page_key = "page.travel.selectPlan"
    definition = @{
        fields = @(
            @{
                id = "planType"
                type = "select"
                label = "Plan Type"
                options = @(
                    @{value = "basic"; label = "Basic"},
                    @{value = "premium"; label = "Premium"}
                )
            }
        )
    }
    created_by = "test-user"
} | ConvertTo-Json -Depth 10

Invoke-RestMethod -Uri "http://localhost:8000/api/pages" `
    -Method Post `
    -ContentType "application/json" `
    -Body $pageJson

Invoke-RestMethod -Uri "http://localhost:8000/api/pages/page.travel.selectPlan/publish" `
    -Method Post

# Create and publish wizard
$wizardJson = @{
    wizard_key = "travel-insurance-uk"
    definition = @{
        steps = @(
            @{
                id = "step1"
                title = "Select Plan"
                pageRef = "page.travel.selectPlan"
            }
        )
    }
    created_by = "test-user"
} | ConvertTo-Json -Depth 10

Invoke-RestMethod -Uri "http://localhost:8000/api/wizards" `
    -Method Post `
    -ContentType "application/json" `
    -Body $wizardJson

Invoke-RestMethod -Uri "http://localhost:8000/api/wizards/travel-insurance-uk/publish" `
    -Method Post

# Get latest published
Invoke-RestMethod -Uri "http://localhost:8000/api/wizards/travel-insurance-uk/latest"

# List all versions
Invoke-RestMethod -Uri "http://localhost:8000/api/wizards/travel-insurance-uk/versions"
```

## Database Verification

Check published versions in database:

```bash
# View wizard versions
docker exec visual-studio-postgres-1 psql -U vsb -d vsb \
  -c "SELECT wizard_key, version, status, published_at FROM wizard_definitions ORDER BY wizard_key, version;"

# View page versions
docker exec visual-studio-postgres-1 psql -U vsb -d vsb \
  -c "SELECT page_key, version, status, published_at FROM page_definitions ORDER BY page_key, version;"

# View full definition
docker exec visual-studio-postgres-1 psql -U vsb -d vsb \
  -c "SELECT wizard_key, version, definition FROM wizard_definitions WHERE wizard_key='travel-insurance-uk' ORDER BY version;"
```

## Key Features Tested

### ✅ Schema Validation
- Pages validated against `packages/schemas/src/page.v1.schema.json`
- Wizards validated against `packages/schemas/src/wizard.v1.schema.json`
- Detailed error messages with field paths

### ✅ Referential Integrity
- Wizard pageRefs must exist as published pages
- Checks performed during publish, not during draft creation
- Clear error messages listing missing page references

### ✅ Version Management
- Auto-incrementing versions: v1, v2, v3...
- GET `/{key}/latest` - Returns latest published version
- GET `/{key}/versions/{version}` - Returns specific version
- GET `/{key}/versions` - Lists all versions (draft + published)

### ✅ Immutability
- Published versions are new database rows (not updates)
- Draft remains after publishing for future edits
- Published versions cannot be modified

### ✅ Checksums
- SHA-256 checksum for each definition
- Automatically recalculated on updates
- Used for integrity verification

## Common Error Responses

**404 Not Found** - No draft exists:
```json
{
  "detail": "No draft found for wizard_key 'unknown-wizard'"
}
```

**400 Bad Request** - Schema validation failed:
```json
{
  "detail": {
    "message": "Schema validation failed",
    "errors": ["Schema validation error at '...': ..."]
  }
}
```

**400 Bad Request** - Referential integrity failed:
```json
{
  "detail": {
    "message": "Referential integrity check failed",
    "errors": ["Page reference 'page.nonexistent' not found or not published"]
  }
}
```

## API Endpoints Summary

### Page Endpoints
- `POST /api/pages` - Create draft
- `GET /api/pages/{page_key}/draft` - Get draft
- `PUT /api/pages/{page_key}/draft` - Update draft
- `DELETE /api/pages/{page_key}/draft` - Delete draft
- `POST /api/pages/{page_key}/publish` - Publish to next version
- `GET /api/pages/{page_key}/latest` - Get latest published
- `GET /api/pages/{page_key}/versions/{version}` - Get specific version
- `GET /api/pages/{page_key}/versions` - List all versions
- `GET /api/pages` - List all pages

### Wizard Endpoints
- `POST /api/wizards` - Create draft
- `GET /api/wizards/{wizard_key}/draft` - Get draft
- `PUT /api/wizards/{wizard_key}/draft` - Update draft
- `DELETE /api/wizards/{wizard_key}/draft` - Delete draft
- `POST /api/wizards/{wizard_key}/publish` - Publish to next version
- `GET /api/wizards/{wizard_key}/latest` - Get latest published
- `GET /api/wizards/{wizard_key}/versions/{version}` - Get specific version
- `GET /api/wizards/{wizard_key}/versions` - List all versions
- `GET /api/wizards` - List all wizards

## Interactive API Documentation

- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc
