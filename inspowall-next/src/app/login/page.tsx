import type { Metadata } from 'next';
import { LoginForm } from '@/components/LoginForm';

export const metadata: Metadata = { title: 'Log In | InspoWall' };

export default function LoginPage() {
  return <LoginForm />;
}
