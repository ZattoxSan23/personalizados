/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Permitir imágenes remotas (para thumbnails de ejercicios)
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**' },
    ],
  },
  experimental: {
    // Permite usar better-sqlite3 nativo
    serverComponentsExternalPackages: ['better-sqlite3'],
  },
};

module.exports = nextConfig;