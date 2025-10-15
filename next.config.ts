export default {
  /* config options here */
  outputFileTracingIncludes: {
    '*': [
      'node_modules/.prisma/client/**/*',
      'node_modules/@prisma/client/**/*',
      'prisma/schema.prisma',
      'prisma/dev.db',
    ],
  },
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },
} satisfies import("next").NextConfig;
