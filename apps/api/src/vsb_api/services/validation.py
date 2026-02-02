"""Validation service for wizard and page definitions."""

import json
from pathlib import Path
from typing import Any, Dict, List

import jsonschema
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

# Cache for loaded JSON schemas
_SCHEMA_CACHE: Dict[str, Dict[str, Any]] = {}


def validate_wizard_definition(definition: Dict[str, Any]) -> List[str]:
    """Validate a wizard definition against the schema.

    Args:
        definition: The wizard definition to validate.

    Returns:
        List of validation error messages, empty if valid.
    """
    errors: List[str] = []

    # Basic structure validation
    if not isinstance(definition, dict):
        errors.append("Definition must be an object")
        return errors

    # Check for required fields
    if "steps" not in definition:
        errors.append("Definition must have 'steps' array")
    elif not isinstance(definition["steps"], list):
        errors.append("'steps' must be an array")
    elif len(definition["steps"]) == 0:
        errors.append("'steps' must have at least one step")
    else:
        # Validate each step
        for i, step in enumerate(definition["steps"]):
            step_errors = validate_step(step, i)
            errors.extend(step_errors)

    return errors


def validate_step(step: Dict[str, Any], index: int) -> List[str]:
    """Validate a single step definition.

    Args:
        step: The step definition.
        index: The step index for error messages.

    Returns:
        List of validation error messages.
    """
    errors: List[str] = []
    prefix = f"Step {index}"

    if not isinstance(step, dict):
        errors.append(f"{prefix}: must be an object")
        return errors

    # Required fields
    if "id" not in step:
        errors.append(f"{prefix}: missing required field 'id'")
    elif not isinstance(step["id"], str) or not step["id"]:
        errors.append(f"{prefix}: 'id' must be a non-empty string")

    if "title" not in step:
        errors.append(f"{prefix}: missing required field 'title'")
    elif not isinstance(step["title"], str):
        errors.append(f"{prefix}: 'title' must be a string")

    # Optional fields validation
    if "fields" in step:
        if not isinstance(step["fields"], list):
            errors.append(f"{prefix}: 'fields' must be an array")
        else:
            for j, field in enumerate(step["fields"]):
                field_errors = validate_field(field, f"{prefix}, Field {j}")
                errors.extend(field_errors)

    return errors


def validate_field(field: Dict[str, Any], prefix: str) -> List[str]:
    """Validate a single field definition.

    Args:
        field: The field definition.
        prefix: Prefix for error messages.

    Returns:
        List of validation error messages.
    """
    errors: List[str] = []

    if not isinstance(field, dict):
        errors.append(f"{prefix}: must be an object")
        return errors

    # Required fields
    if "id" not in field:
        errors.append(f"{prefix}: missing required field 'id'")

    if "type" not in field:
        errors.append(f"{prefix}: missing required field 'type'")
    else:
        valid_types = ["text", "email", "number", "select", "checkbox", "textarea", "date"]
        if field["type"] not in valid_types:
            errors.append(f"{prefix}: invalid type '{field['type']}'. Must be one of {valid_types}")

    if "label" not in field:
        errors.append(f"{prefix}: missing required field 'label'")

    # Type-specific validation
    if field.get("type") == "select" and "options" not in field:
        errors.append(f"{prefix}: select fields must have 'options' array")

    return errors


def validate_page_definition(definition: Dict[str, Any]) -> List[str]:
    """Validate a page definition against the schema.

    Args:
        definition: The page definition to validate.

    Returns:
        List of validation error messages, empty if valid.
    """
    errors: List[str] = []

    if not isinstance(definition, dict):
        errors.append("Definition must be an object")
        return errors

    # Check for fields
    if "fields" in definition:
        if not isinstance(definition["fields"], list):
            errors.append("'fields' must be an array")
        else:
            for i, field in enumerate(definition["fields"]):
                field_errors = validate_field(field, f"Field {i}")
                errors.extend(field_errors)

    return errors


def validate_against_json_schema(
    data: Dict[str, Any],
    schema: Dict[str, Any],
) -> List[str]:
    """Validate data against a JSON Schema.

    Args:
        data: The data to validate.
        schema: The JSON Schema to validate against.

    Returns:
        List of validation error messages.
    """
    errors: List[str] = []

    try:
        jsonschema.validate(instance=data, schema=schema)
    except jsonschema.ValidationError as e:
        errors.append(str(e.message))
    except jsonschema.SchemaError as e:
        errors.append(f"Invalid schema: {e.message}")

    return errors


def load_schema(schema_name: str) -> Dict[str, Any]:
    """Load JSON schema from packages/schemas/src/ directory.

    Schemas are cached in memory for performance.

    Args:
        schema_name: Name of schema without extension (e.g., "wizard.v1", "page.v1")

    Returns:
        Loaded JSON schema as dictionary.

    Raises:
        FileNotFoundError: If schema file doesn't exist.
    """
    if schema_name in _SCHEMA_CACHE:
        return _SCHEMA_CACHE[schema_name]

    # Path from API root to schemas package
    # apps/api/src/vsb_api/services -> ../../../../../../packages/schemas/src/
    schema_path = (
        Path(__file__).parent.parent.parent.parent.parent.parent
        / "packages"
        / "schemas"
        / "src"
        / f"{schema_name}.schema.json"
    )

    if not schema_path.exists():
        raise FileNotFoundError(f"Schema file not found: {schema_path}")

    with open(schema_path, "r", encoding="utf-8") as f:
        schema = json.load(f)

    _SCHEMA_CACHE[schema_name] = schema
    return schema


def validate_with_schema(definition: Dict[str, Any], schema_version: str) -> List[str]:
    """Validate definition against JSON schema file.

    Args:
        definition: The wizard/page definition to validate.
        schema_version: Schema version (e.g., "wizard.v1", "page.v1")

    Returns:
        List of validation error messages, empty if valid.
    """
    errors: List[str] = []

    try:
        schema = load_schema(schema_version)
        jsonschema.validate(definition, schema)
    except jsonschema.ValidationError as e:
        # Format error with path for better debugging
        path = " -> ".join(str(p) for p in e.absolute_path) if e.absolute_path else "root"
        errors.append(f"Schema validation error at '{path}': {e.message}")
    except FileNotFoundError as e:
        errors.append(f"Schema file not found: {schema_version}")
    except Exception as e:
        errors.append(f"Validation error: {str(e)}")

    return errors


async def validate_wizard_page_refs(
    definition: Dict[str, Any],
    db: AsyncSession,
) -> List[str]:
    """Validate all pageRef references exist as published pages.

    Args:
        definition: The wizard definition containing steps with pageRef fields.
        db: Database session for querying page definitions.

    Returns:
        List of error messages for missing page references, empty if all valid.
    """
    from vsb_api.models.page import PageDefinition

    errors: List[str] = []

    # Extract unique page references from steps
    steps = definition.get("steps", [])
    page_refs = set()

    for step in steps:
        page_ref = step.get("pageRef")
        if page_ref:  # Skip steps with inline fields
            page_refs.add(page_ref)

    # Check each page reference exists as published
    for page_ref in page_refs:
        # Parse pageRef format: "page_key@version" (e.g., "page.travel.start@v1")
        if "@" in page_ref:
            page_key, version = page_ref.rsplit("@", 1)
        else:
            # No version specified - look for any published version
            page_key = page_ref
            version = None

        query = select(PageDefinition).where(
            PageDefinition.page_key == page_key,
            PageDefinition.status == "published",
        )
        if version:
            query = query.where(PageDefinition.version == version)

        result = await db.execute(query)
        page = result.scalar_one_or_none()

        if not page:
            errors.append(
                f"Page reference '{page_ref}' not found or not published"
            )

    return errors
