/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  async rewrites() {
    return [
      {
        source: "/open-graph",
        destination: "/api/open-graph",
      },
    ];
  },
};

module.exports = nextConfig;
