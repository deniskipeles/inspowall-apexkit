import { ApexKit } from '@apexkit/sdk';

const APP_URL = process.env.NEXT_PUBLIC_API_URL?.trim() || 'http://127.0.0.1:5000';
const TENANT_ID = process.env.NEXT_PUBLIC_TENANT_ID?.trim() || 'vortex';

export const apexRoot = new ApexKit(APP_URL);
export const apex = apexRoot.tenant(TENANT_ID);

// Cloudflare's free plan caps image resizing at 10k unique transforms/month.
// We always ask our backend to do the resize (backend=true), which means the
// URL coming back is a plain image CDN URL and CF just caches the bytes without
// running its own transform pipeline.
//
// The only fallback we need: if the backend size param happens to be empty or
// the backend is unreachable, we let CF handle it rather than serving a raw
// unresized original to the client.
export async function getImageUrl(filename: string, size?: string): Promise<string> {
  if (!filename) return '';

  // Already a full external URL (dicebear avatar, google auth, etc) — pass through.
  if (filename.startsWith('http://') || filename.startsWith('https://')) {
    return filename;
  }

  // Resolves to the absolute backend URL
  const backendUrl = await apex.files.getFileUrl(filename, { format: "webp", quality: 80, thumb: size });

  try {
    // We parse the URL and replace the backend domain with our frontend proxy path
    // e.g., transforms https://backend.com/tenant/vortex/api/v1/storage/file/123.jpg?thumb=300x0 
    // into /_cdn/tenant/vortex/api/v1/storage/file/123.jpg?thumb=300x0
    const urlObj = new URL(backendUrl);
    return `/_cdn${urlObj.pathname}${urlObj.search}`;
  } catch (e) {
    return backendUrl;
  }
}

export * from '@apexkit/sdk';