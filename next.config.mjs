import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Lean server bundle for the Docker image (the eventual move to the Houli server).
  output: "standalone",
  serverExternalPackages: ["@node-rs/argon2", "@prisma/client"],
  // Two lockfiles exist on this machine; pin the tracing root to this project.
  outputFileTracingRoot: import.meta.dirname,
};

export default withNextIntl(nextConfig);
