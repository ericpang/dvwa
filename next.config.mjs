/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: true,
  headers: async () => {
    return [
      {
        source: "/api/:path*",
        headers: [
          { key: "X-Powered-By", value: "VulnLab-Engine/1.0.0 (Next.js; Neon-Postgres)" },
          { key: "Access-Control-Allow-Origin", value: "*" },
          { key: "Access-Control-Allow-Methods", value: "GET, POST, PUT, DELETE, PATCH, OPTIONS" },
          { key: "Access-Control-Allow-Headers", value: "Content-Type, Authorization, X-HTTP-Method-Override, X-Security-Level" }
        ]
      }
    ];
  }
};

export default nextConfig;
