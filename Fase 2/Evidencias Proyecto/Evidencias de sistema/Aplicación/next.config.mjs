import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // Habilitar modo standalone para Docker
  output: 'standalone',
  // Configurar turbopack root para evitar warning de múltiples lockfiles
  turbopack: {
    root: __dirname,
  },
  async rewrites() {
    // En Docker, usar el nombre del servicio; en desarrollo, usar localhost
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 
      (process.env.NODE_ENV === 'production' ? 'http://backend:3001' : 'http://localhost:3001');
    
    return [
      {
        source: "/api/:path*",
        destination: `${backendUrl}/api/:path*`,
      },
    ]
  },
}

export default nextConfig
