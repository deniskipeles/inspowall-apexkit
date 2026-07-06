import { ApexKit } from "@apexkit/sdk";
// Initialize the root ApexKit client
const APP_URL = (import.meta as any).env.VITE_API_URL?.trim() || 'http://127.0.0.1:5000';
export const apexRoot = new ApexKit(APP_URL);

// Export the tenant-specific instance for 'vortex'
export const apex = apexRoot.tenant('vortex');

// Re-export everything from the SDK so other files can import types directly from here if needed
export * from '@apexkit/sdk';