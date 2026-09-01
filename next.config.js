/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    serverActions: { allowedOrigins: ["*"] }
  },
  // Разрешаем открывать сайт внутри Telegram Mini App (без X-Frame-Options DENY)
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "ALLOWALL" },
          { key: "Content-Security-Policy", value: "frame-ancestors 'self' https://web.telegram.org https://telegram.org;" }
        ]
      }
    ];
  }
};

module.exports = nextConfig;
