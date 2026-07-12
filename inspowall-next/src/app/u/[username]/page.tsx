import { apex } from '@/lib/apex';
import { ProfilePageClient } from '@/components/ProfilePageClient';
import type { Metadata } from 'next';

async function getProfile(username: string) {
  try {
    const list = await apex.collection('user_profile').list({
      filter: { username },
      per_page: 1,
    });
    if (!list.total) return null;
    const record = list.items[0];
    const data = record.data || record;
    return {
      id: record.id,
      userId: data.user_id,
      username: data.username,
      avatar: data.avatar
        ? await apex.files.getFileUrl(data.avatar)
        : `https://api.dicebear.com/7.x/avataaars/svg?seed=${data.username}`,
      name: data.name || data.username,
      bio: data.bio || null,
      website: data.website || null,
      ...data,
    };
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>;
}): Promise<Metadata> {
  const { username } = await params;
  const profile = await getProfile(username);
  if (!profile) return { title: `@${username} | InspoWall` };
  return {
    title: `${profile.name} (@${username}) | InspoWall`,
    description: profile.bio || `Check out ${profile.name}'s pins on InspoWall.`,
  };
}

export default async function UserProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const profile = await getProfile(username);
  return <ProfilePageClient username={username} initialProfile={profile} />;
}