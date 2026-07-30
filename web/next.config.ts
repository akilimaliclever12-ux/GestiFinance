import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // Fixe la racine du projet (plusieurs lockfiles présents sur la machine).
  turbopack: {
    root: path.join(__dirname),
  },
};

export default nextConfig;
