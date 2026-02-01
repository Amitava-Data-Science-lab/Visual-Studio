import { Routes, Route } from 'react-router-dom';
import { WizardList } from '@/features/wizard-list';
import { WizardEditor } from '@/features/wizard-editor';
import { PageEditor } from '@/features/page-editor';
import { Preview } from '@/features/preview';
import { Publish } from '@/features/publish';

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<WizardList />} />
      <Route path="/wizards/:wizardKey" element={<WizardEditor />} />
      <Route path="/pages/:pageKey" element={<PageEditor />} />
      <Route path="/preview" element={<Preview />} />
    </Routes>
  );
}
