const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:5000';
let apiHost = '127.0.0.1';
try {
  apiHost = new URL(apiUrl).hostname;
} catch {
  // fall back to default above
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: apiHost },
      { protocol: 'http', hostname: apiHost },
      { protocol: 'https', hostname: 'api.dicebear.com' },
    ],
  },
};

export default nextConfig;
