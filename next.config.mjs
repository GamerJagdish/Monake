/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [
      {
        // Cache static assets (images, audio, etc.) for 1 year
        source: '/sounds/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        // Cache images for 1 year
        source: '/images/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=0, immutable',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
