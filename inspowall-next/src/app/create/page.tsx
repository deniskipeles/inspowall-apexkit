import type { Metadata } from 'next';
import { CreatePinForm } from '@/components/CreatePinForm';

export const metadata: Metadata = { title: 'Create Pin | InspoWall' };

export default function CreatePinPage() {
  return <CreatePinForm />;
}
