import type { NextConfig } from "next";

const securityHeaders = [
  // Content Security Policy
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' https://www.googletagmanager.com https://www.google-analytics.com",
      "img-src 'self' data: https://www.google-analytics.com https://www.googletagmanager.com",
      "connect-src 'self' https://*.supabase.co https://www.google-analytics.com https://www.googletagmanager.com https://api.resend.com https://api.dvf.gouv.fr https://formsubmit.co",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "frame-ancestors 'none'",
    ].join("; "),
  },
  // Interdit l'affichage dans des iframes (clickjacking)
  { key: "X-Frame-Options", value: "DENY" },
  // Empêche le MIME sniffing
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Force HTTPS pour 2 ans, inclut sous-domaines
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  // Politique de referrer stricte
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Désactive caméra, micro, géolocalisation
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), interest-cohort=()" },
  // Désactive la détection XSS des anciens navigateurs (inutile en mode "block" moderne)
  { key: "X-XSS-Protection", value: "1; mode=block" },
];

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  async headers() {
    return [
      {
        // Applique les headers à toutes les routes
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
  async rewrites() {
    return {
      beforeFiles: [
        {
          source: "/",
          destination: "/immoverdict.html",
        },
      ],
    };
  },
};

export default nextConfig;