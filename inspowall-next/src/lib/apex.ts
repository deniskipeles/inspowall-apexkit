import { ApexKit } from '@apexkit/sdk';

// This module runs both on the server (Server Components, generateMetadata)
// and on the client (Client Components) — the SDK itself is just fetch-based,
// so it works fine in both places. Only AuthContext touches localStorage.
const APP_URL = process.env.NEXT_PUBLIC_API_URL?.trim() || 'http://127.0.0.1:5000';

export const apexRoot = new ApexKit(APP_URL);
export const apex = apexRoot.tenant('vortex');

export * from '@apexkit/sdk';
