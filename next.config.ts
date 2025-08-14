import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  webpack: (config, { isServer }) => {
    // Only exclude from client-side bundle, keep for server
    if (!isServer) {
      config.externals = config.externals || [];
      config.externals.push({
        '@langchain/google-genai': 'commonjs @langchain/google-genai',
        '@langchain/core/prompts': 'commonjs @langchain/core/prompts',
        'langchain/output_parsers': 'commonjs langchain/output_parsers',
        'zod': 'commonjs zod'
      });
    }
    
    // Ignore these modules during build analysis
    config.resolve = config.resolve || {};
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
      crypto: false,
    };
    
    return config;
  },
  
  // Tell Next.js these are server-only
  serverComponentsExternalPackages: [
    '@langchain/google-genai',
    '@langchain/core',
    'langchain',
    'zod'
  ],
}

export default nextConfig