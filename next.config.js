/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: "standalone",
  experimental: {
    serverActions: { allowedOrigins: ["*"] }
  },
  // Allow opening the site inside AI Studio Preview and Telegram Web App
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "Content-Security-Policy", value: "frame-ancestors 'self' https: http:;" }
        ]
      }
    ];
  }
};

module.exports = nextConfig;

