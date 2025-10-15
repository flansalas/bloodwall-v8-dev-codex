export default {
  /* config options here */
  outputFileTracingIncludes: {
    "/**/*": [
      "node_modules/.prisma/client/**",
      "prisma/**",
    ],
  },
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },
} satisfies import("next").NextConfig;
