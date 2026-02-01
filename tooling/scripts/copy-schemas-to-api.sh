#!/bin/bash
#
# Copy JSON schemas from packages/schemas to apps/api
#
# Usage: ./tooling/scripts/copy-schemas-to-api.sh
#

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"

SOURCE_DIR="$ROOT_DIR/packages/schemas/src"
DEST_DIR="$ROOT_DIR/apps/api/src/vsb_api/schemas/jsonschema"

echo "Copying JSON schemas..."

# Create destination directory
mkdir -p "$DEST_DIR"

# Copy schema files
cp "$SOURCE_DIR"/*.schema.json "$DEST_DIR/"

echo "Copied schemas to $DEST_DIR"
ls -la "$DEST_DIR"

echo "Done!"
