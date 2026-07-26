import type { Metadata } from 'next';
import { OpenGraphStudio } from '@/components/OpenGraphStudio';

export const metadata: Metadata = {
  title: 'OpenGraph Studio | InspoWall Developer',
  description: 'Manage OpenGraph API keys and test edge-cached card generation.',
};

export default function OpenGraphStudioPage() {
  return <OpenGraphStudio />;
}