import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ['192.168.188.20', 'http://192.168.188.20:3000', '100.120.113.87'],
  serverExternalPackages: ['playwright-chromium'],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'pkmgloiixwvhitqpcfyc.supabase.co',
        pathname: '/storage/**',
      },
    ],
  },
};

export default nextConfig;
