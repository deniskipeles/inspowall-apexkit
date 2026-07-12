import type { Metadata } from 'next';
import { ProfileClient } from '@/components/ProfileClient';

// Can't know the user's name at SSR time (auth is a client-side localStorage
// token), so this stays generic. ProfileClient sets the visible <h1> dynamically.
export const metadata: Metadata = { title: 'Profile | InspoWall' };

export default function ProfilePage() {
  return <ProfileClient />;
}
