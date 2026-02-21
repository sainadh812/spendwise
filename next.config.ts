import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingIncludes: {
    "/api/**/*": ['./node_modules/.prisma/client/**/*', "./src/generated/prisma/*.node"],
    "/app/**/*": ['./node_modules/.prisma/client/**/*', "./src/generated/prisma/*.node"],
  },
};

export default nextConfig;
