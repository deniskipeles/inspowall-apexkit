import type { Metadata } from 'next';
import { RegisterForm } from '@/components/RegisterForm';

export const metadata: Metadata = { title: 'Sign Up | Vortex' };

export default function RegisterPage() {
  return <RegisterForm />;
}
