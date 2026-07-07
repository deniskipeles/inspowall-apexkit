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
    // Disable Next.js/Cloudflare edge image optimisation entirely —
    // our backend already serves pre-optimised WebP at the right size
    // via the ?size= param, so running a second compression pass on
    // the edge is pure waste and burns CF transform budget.
    unoptimized: true,

    remotePatterns: [
      { protocol: 'https', hostname: apiHost },
      { protocol: 'http', hostname: apiHost },
      { protocol: 'https', hostname: 'api.dicebear.com' },
    ],
  },
  // 1. Force the edge to cache these responses heavily
  async headers() {
    return [
      {
        source: '/_cdn/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },

  // 2. Proxy the /_cdn/ route to your backend smoothly at the edge
  async rewrites() {
    return [
      {
        source: '/_cdn/:path*',
        destination: `${apiUrl}/:path*`, 
      },
    ];
  },
};

export default nextConfig;