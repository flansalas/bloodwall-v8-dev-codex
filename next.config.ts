export default {
  /* config options here */
  experimental: {
    outputFileTracingIncludes: {
      // Include our local SQLite + schema in all functions
      '/**': ['./prisma/dev.db', './prisma/schema.prisma'],
    },
  },
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },
} satisfies import("next").NextConfig;
