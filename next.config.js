/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    unoptimized: true,
    domains: ['s2chrms.s3.amazonaws.com'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 's2chrms.s3.amazonaws.com',
        port: '',
        pathname: '/crm-logos/images/**',
      },
    ],
  },
};

module.exports = nextConfig;