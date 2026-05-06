/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // Permite que el iframe de Street View y los tiles de Google Maps carguen
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          // Permite Google Maps en la página
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://maps.googleapis.com https://maps.gstatic.com",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' https://fonts.gstatic.com",
              "img-src 'self' data: blob: https://*.googleapis.com https://*.gstatic.com https://maps.gstatic.com https://*.google.com https://*.ggpht.com",
              "connect-src 'self' https://*.googleapis.com https://*.gstatic.com",
              "frame-src https://www.google.com",
              "worker-src blob:",
            ].join('; '),
          },
        ],
      },
    ];
  },

  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '*.googleapis.com' },
      { protocol: 'https', hostname: '*.gstatic.com' },
      { protocol: 'https', hostname: '*.google.com' },
    ],
  },
};

module.exports = nextConfig;
