import type { Metadata } from 'next';
import { RegisterForm } from '@/components/RegisterForm';

export const metadata: Metadata = { title: 'Sign Up | InspoWall' };

export default function RegisterPage() {
  return <RegisterForm />;
}
