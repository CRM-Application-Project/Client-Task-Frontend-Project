/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone', // Enable standalone output for Docker
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
    domains: [
      's2chrms.s3.amazonaws.com',
      'images.pexels.com' // Add this line
    ],
    // Alternatively, you can use remotePatterns for more control:
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 's2chrms.s3.amazonaws.com',
        port: '',
        pathname: '/crm-logos/images/**',
      },
      {
        protocol: 'https',
        hostname: 'images.pexels.com', // Add this pattern
        port: '',
        pathname: '/photos/**',
      },
    ],
  },
}

module.exports = nextConfig