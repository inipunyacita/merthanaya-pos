import type { NextConfig } from "next";
const nextConfig: NextConfig = {
  devIndicators: false,
  output: 'standalone',  // Add this line
};
export default nextConfig;