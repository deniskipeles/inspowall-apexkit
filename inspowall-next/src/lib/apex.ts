import { ApexKit } from '@apexkit/sdk';

const APP_URL = process.env.NEXT_PUBLIC_API_URL?.trim() || 'http://127.0.0.1:5000';
const TENANT_ID = process.env.NEXT_PUBLIC_TENANT_ID?.trim() || 'vortex';

export const apexRoot = new ApexKit(APP_URL);
export const apex = apexRoot.tenant(TENANT_ID);

/**
 * Resolves pre-optimized, cached image URLs served directly from the 
 * tenant's local VFS cache to bypass backend transform limits.
 */
export async function getImageUrl(filename: string, size?: string): Promise<string> {
  if (!filename) return '';

  // Already a full external URL (dicebear avatar, google auth, etc) — pass through.
  if (filename.startsWith('http://') || filename.startsWith('https://')) {
    return filename;
  }

  const base = apex.baseUrl.replace(/\/$/, '');
  const thumbQuery = size ? `?thumb=${encodeURIComponent(size)}` : '';
  
  // Routes through the Hono media cache webhook: /api/v1/webhook/media/image/:filename
  const backendUrl = `${base}/api/v1/webhook/media/image/${encodeURIComponent(filename)}${thumbQuery}`;

  try {
    const urlObj = new URL(backendUrl);
    return `/_cdn${urlObj.pathname}${urlObj.search}`;
  } catch (e) {
    return backendUrl;
  }
}

export * from '@apexkit/sdk';