/**
 * Validates example files against their schemas.
 */

import Ajv from 'ajv';
import { readFileSync, readdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const ajv = new Ajv({ allErrors: true, verbose: true });

// Load schemas
const schemasDir = join(__dirname, '..', 'src');
const wizardSchema = JSON.parse(readFileSync(join(schemasDir, 'wizard.v1.schema.json'), 'utf-8'));
const pageSchema = JSON.parse(readFileSync(join(schemasDir, 'page.v1.schema.json'), 'utf-8'));
const conditionSchema = JSON.parse(readFileSync(join(schemasDir, 'condition.v1.schema.json'), 'utf-8'));

// Compile validators
const validateWizard = ajv.compile(wizardSchema);
const validatePage = ajv.compile(pageSchema);
const validateCondition = ajv.compile(conditionSchema);

// Validate examples
const examplesDir = join(__dirname, '..', 'examples');

let hasErrors = false;

function validateFile(filePath: string, validator: ReturnType<typeof ajv.compile>, schemaName: string) {
  console.log(`Validating ${filePath}...`);

  const content = JSON.parse(readFileSync(filePath, 'utf-8'));
  const valid = validator(content);

  if (!valid) {
    console.error(`  ❌ ${schemaName} validation failed:`);
    validator.errors?.forEach((err) => {
      console.error(`    - ${err.instancePath}: ${err.message}`);
    });
    hasErrors = true;
  } else {
    console.log(`  ✓ Valid ${schemaName}`);
  }
}

// Check if examples directory exists
if (existsSync(examplesDir)) {
  // Validate wizard examples
  const wizardExamples = readdirSync(examplesDir).filter(
    (f) => f.startsWith('wizard.') && f.endsWith('.json')
  );

  for (const file of wizardExamples) {
    validateFile(join(examplesDir, file), validateWizard, 'Wizard');
  }

  // Validate page examples in subdirectories
  const pageDirs = readdirSync(examplesDir).filter((f) => f.startsWith('pages.'));

  for (const dir of pageDirs) {
    const pagesPath = join(examplesDir, dir);
    const pageFiles = readdirSync(pagesPath).filter((f) => f.endsWith('.json'));

    for (const file of pageFiles) {
      validateFile(join(pagesPath, file), validatePage, 'Page');
    }
  }
} else {
  console.log('No examples directory found. Creating example files...');
}

if (hasErrors) {
  console.error('\n❌ Validation failed');
  process.exit(1);
} else {
  console.log('\n✓ All examples valid');
}
