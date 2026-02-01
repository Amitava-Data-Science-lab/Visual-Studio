#!/bin/bash
#
# Generate TypeScript client from OpenAPI spec
#
# Usage: ./tooling/scripts/gen-openapi-client.sh
#
# Requirements:
#   - The API server must be running on localhost:8000
#   - openapi-typescript-codegen must be installed
#

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"

API_URL="${API_URL:-http://localhost:8000}"
OUTPUT_DIR="${OUTPUT_DIR:-$ROOT_DIR/packages/sdk/src/api-client}"

echo "Fetching OpenAPI spec from $API_URL/openapi.json..."

# Create output directory
mkdir -p "$OUTPUT_DIR"

# Generate client
npx openapi-typescript-codegen \
  --input "$API_URL/openapi.json" \
  --output "$OUTPUT_DIR" \
  --client fetch \
  --useOptions \
  --useUnionTypes

echo "Generated API client in $OUTPUT_DIR"

# Format generated files
if command -v prettier &> /dev/null; then
  echo "Formatting generated files..."
  npx prettier --write "$OUTPUT_DIR/**/*.ts"
fi

echo "Done!"
