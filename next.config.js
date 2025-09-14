/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  experimental: {
    optimizePackageImports: ['@radix-ui/react-icons', 'lucide-react'],
  },
  eslint: {
    // Only run ESLint on these directories during production builds
    dirs: ['pages', 'components', 'lib', 'src'],
  },
  typescript: {
    // Enable type checking during build
    ignoreBuildErrors: false,
  },
  images: {
    domains: ['s2chrms.s3.amazonaws.com'],
    // Alternatively, you can use remotePatterns for more control:
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 's2chrms.s3.amazonaws.com',
        port: '',
        pathname: '/crm-logos/images/**',
      },
    ],
  },
}

module.exports = nextConfig