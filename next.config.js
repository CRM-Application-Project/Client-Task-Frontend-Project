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
}

module.exports = nextConfig