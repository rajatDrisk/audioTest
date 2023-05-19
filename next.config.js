/** @type {import('next').NextConfig} */

const withPWA = require("next-pwa")({
  dest: "public",
});

const ContentSecurityPolicy = `
    frame-src 'self' https://www.google.com https://www.youtube.com/ https://tally.so/ https://global-stg.transak.com/ https://global.transak.com/ https://form.typeform.com/to/S7Cy995n;
  `;

const securityHeaders = [
  {
    key: "X-Frame-Options",
    value: "SAMEORIGIN",
  },
  {
    key: "X-XSS-Protection",
    value: "1; mode=block",
  },
  {
    key: "Content-Security-Policy",
    value: ContentSecurityPolicy.replace(/\s{2,}/g, " ").trim(),
  },
];

module.exports = withPWA({
  reactStrictMode: false,
  output: "standalone",
  swcMinify: true,
  output: "standalone",
  images: {
    minimumCacheTTL: 60 * 3,
    domains: [
      "content.drisk.io",
      "lh3.googleusercontent.com",
      "drisk.io",
      "pbs.twimg.com",
      "assets.coingecko.com",
      "asset-images.messari.io",
      "www.coingecko.com",
      "s3.coinmarketcap.com",
      "s2.coinmarketcap.com",
      "res.cloudinary.com",
    ],
  },
  pwa: {
    dest: "public",
    register: true,
    skipWaiting: true,
    disable: process.env.NODE_ENV === "development",
  },
  i18n: {
    locales: ["en", "id", "vi", "zh", "fil", "th"],
    defaultLocale: "en",
  },
  async headers() {
    return [
      {
        // Apply these headers to all routes in your application.
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
});
