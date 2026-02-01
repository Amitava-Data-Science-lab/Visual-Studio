import { runtimeApi, type WizardDefinition, type PageDefinition, type WizardStep } from '@/api/runtimeApi';

// Parse pageRef format: "page.travel.selectPlan@v1"
export function parsePageRef(pageRef: string): { pageKey: string; version: string } {
  const parts = pageRef.split('@');
  if (parts.length !== 2) {
    throw new Error(`Invalid pageRef format: ${pageRef}. Expected "pageKey@version"`);
  }
  return {
    pageKey: parts[0],
    version: parts[1]
  };
}

export async function loadWizardPages(wizard: WizardDefinition): Promise<Record<string, PageDefinition>> {
  // Extract unique pageRefs from steps
  const pageRefs = new Set<string>();
  for (const step of wizard.definition.steps || []) {
    if (step.pageRef) {
      pageRefs.add(step.pageRef);
    }
  }

  // Load all pages in parallel with VERSION PINNING
  const pagePromises = Array.from(pageRefs).map(async (pageRef) => {
    const { pageKey, version } = parsePageRef(pageRef);
    const page = await runtimeApi.loadPageVersion(pageKey, version);
    return [pageRef, page] as const; // Use full pageRef as key
  });

  const pages = await Promise.all(pagePromises);

  // Convert to map: pageRef → PageDefinition
  return Object.fromEntries(pages);
}

export function getPageForStep(
  step: WizardStep,
  pagesMap: Record<string, PageDefinition>
): PageDefinition | null {
  if (!step.pageRef) return null; // Step has inline fields
  return pagesMap[step.pageRef] || null;
}
