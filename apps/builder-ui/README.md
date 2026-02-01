# Visual Studio Builder UI

JSON-first wizard builder interface for creating and publishing wizard definitions.

## Features

- **Wizard List**: View all wizard drafts with metadata
- **Create Wizard**: Create new wizard drafts with a wizard key
- **JSON Editor**: Monaco editor with syntax highlighting
- **Client-side Validation**: AJV validation against `wizard.v1.schema.json`
- **Save Draft**: Update wizard drafts via API
- **Publish**: Publish validated wizards to immutable versions

## Prerequisites

1. **Database** must be running:
   ```bash
   pnpm db:up
   ```

2. **API** must be running:
   ```bash
   cd apps/api
   .venv/Scripts/activate
   python -m vsb_api.main
   ```

   The API should be accessible at `http://localhost:8000`

## Getting Started

1. **Install dependencies** (from monorepo root):
   ```bash
   pnpm install
   ```

2. **Start the Builder UI**:
   ```bash
   cd apps/builder-ui
   pnpm dev
   ```

   The UI will start at `http://localhost:3000` (or `http://localhost:3001` if 3000 is in use)

## Usage Workflow

### 1. Create a New Wizard

1. Click **"Create New Wizard"** on the home page
2. Enter a wizard key (e.g., `travel-insurance-uk`)
3. Click **"Create"**
4. You'll be redirected to the editor with a starter template

### 2. Edit Wizard Definition

The JSON editor starts with a basic template:

```json
{
  "steps": [
    {
      "id": "step1",
      "title": "First Step",
      "fields": [
        {
          "id": "field1",
          "type": "text",
          "label": "Example Field"
        }
      ]
    }
  ]
}
```

**Supported Field Types:**
- `text`, `email`, `number`, `select`, `checkbox`, `textarea`, `date`, `radio`, `file`, `hidden`

### 3. Validate

Click **"Validate"** to check your JSON against the wizard schema.

Validation checks:
- ✅ Valid JSON syntax
- ✅ Matches `wizard.v1.schema.json` structure
- ✅ All required fields present
- ✅ Field types are valid
- ✅ `select` fields have proper `options` format

**Example validation error:**
```
Schema validation error at 'steps -> 0 -> fields -> 0 -> options -> 0': 'basic' is not of type 'object'
```

**Fix:** Options must be objects with `value` and `label`:
```json
{
  "options": [
    {"value": "basic", "label": "Basic"},
    {"value": "premium", "label": "Premium"}
  ]
}
```

### 4. Save Draft

Click **"Save Draft"** to persist your changes to the API.

**API Call:**
```
PUT /api/wizards/{wizard_key}/draft
```

**What happens:**
- Validates the JSON first
- Updates the wizard definition
- Recalculates checksum
- Shows "Last saved" timestamp

### 5. Publish

Click **"Publish"** to create an immutable version.

**API Call:**
```
POST /api/wizards/{wizard_key}/publish
```

**What happens:**
1. Validates against JSON schema
2. Checks referential integrity (wizard pageRefs must exist as published pages)
3. Determines next version (v1, v2, v3, ...)
4. Creates new immutable row in database
5. Draft remains for future edits

**Success:**
```
Successfully published travel-insurance-uk as v1!

Checksum: 2cc2f5ec51dccab1...
```

**Failure (referential integrity):**
```
Referential integrity check failed

Errors:
- Page reference 'page.nonexistent' not found or not published
```

## Tips & Tricks

### Format JSON
Click **"Format JSON"** to auto-format your JSON with proper indentation.

### Use Monaco Features
- **Ctrl+Space**: Auto-complete
- **Ctrl+F**: Find
- **Ctrl+H**: Find & Replace
- **Alt+Shift+F**: Format document

### Validation Before Save
The UI validates before saving to prevent server-side errors. Fix validation errors shown in the red banner.

### Checksum Verification
Each definition has a SHA-256 checksum for integrity verification. Checksums are shown in the header (truncated) with full value on hover.

## Architecture

```
Builder UI (React + Vite + TypeScript)
  ↓
API Client (Fetch)
  ↓
FastAPI Backend (localhost:8000)
  ↓
PostgreSQL Database
```

### Components

- **WizardList** - Lists all wizard drafts with create/delete actions
- **WizardEditor** - JSON editor with validation, save, and publish
- **JsonEditor** - Monaco editor wrapper
- **API Client** - Type-safe API calls

### Validation Flow

```
User edits JSON
  ↓
Click "Validate"
  ↓
Parse JSON
  ↓
AJV validates against wizard.v1.schema.json
  ↓
Show ✓ Success or ✗ Errors with field paths
```

### Publish Flow

```
User clicks "Publish"
  ↓
Client validates (AJV)
  ↓
Save draft to API (if changed)
  ↓
POST /api/wizards/{key}/publish
  ↓
Server validates:
  - JSON schema (wizard.v1.schema.json)
  - Referential integrity (pageRefs exist)
  ↓
Create new immutable version (v1, v2, ...)
  ↓
Return success with version and checksum
```

## Troubleshooting

### Port 3000 in use
Vite will automatically try port 3001. Check the terminal output for the actual port.

### API not accessible
Ensure the API is running on `http://localhost:8000`:
```bash
cd apps/api
.venv/Scripts/activate
python -m vsb_api.main
```

Check the API health endpoint:
```bash
curl http://localhost:8000/health
```

### Validation errors
Read the error carefully - it shows the exact path:
```
steps -> 0 -> fields -> 1 -> type: must be one of [text, email, number, ...]
```

This means: `definition.steps[0].fields[1].type` is invalid.

### Cannot publish
Common reasons:
1. **Validation failed**: Fix JSON schema errors first
2. **Referential integrity**: Referenced pages don't exist or aren't published
3. **Network error**: API is not running or not accessible

### Schema errors
The JSON schema is strict. Common mistakes:
- `options` as strings instead of objects
- Missing required fields (`id`, `type`, `label`)
- Invalid field types
- Steps without `id` or `title`

## API Endpoints Used

- `GET /api/wizards` - List wizard drafts
- `GET /api/wizards/{wizard_key}/draft` - Get wizard draft
- `POST /api/wizards` - Create wizard draft
- `PUT /api/wizards/{wizard_key}/draft` - Update wizard draft
- `DELETE /api/wizards/{wizard_key}/draft` - Delete wizard draft
- `POST /api/wizards/{wizard_key}/publish` - Publish wizard to immutable version

See [API PUBLISH_TESTING.md](../api/PUBLISH_TESTING.md) for detailed API documentation.

## Next Steps

1. **Add Page Editor**: Similar JSON editor for page definitions
2. **Visual Editor**: Drag-and-drop UI builder (later phase)
3. **Preview Mode**: Live preview of wizard definitions
4. **Version History**: View and diff published versions
5. **Import/Export**: Download/upload wizard JSON files

## Development

```bash
# Install dependencies
pnpm install

# Start dev server
pnpm dev

# Build for production
pnpm build

# Run tests
pnpm test

# Lint
pnpm lint
```

## Tech Stack

- **React 18** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **Monaco Editor** - Code editor (VS Code's editor)
- **AJV** - JSON schema validation
- **React Router** - Routing
- **CSS Variables** - Styling

## Project Structure

```
apps/builder-ui/
├── src/
│   ├── api/            # API client and types
│   ├── app/            # App shell and routes
│   ├── components/     # Reusable components
│   ├── features/       # Feature modules
│   │   ├── wizard-list/    # Wizard list page
│   │   └── wizard-editor/  # Wizard editor page
│   ├── styles/         # Global styles
│   └── main.tsx        # Entry point
├── package.json
├── vite.config.ts
└── tsconfig.json
```
