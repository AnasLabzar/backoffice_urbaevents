import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  // ZID GHIR HAD L-PARTIE L-DAKHILIYA
  eslint: {
    // Hada kaygoul l-Next.js y-doz l-build wakha ykon 3ndek errors dyal ESLint
    ignoreDuringBuilds: true,
  },
  // (Dakchi l-khor li 3ndek khllih)
};

module.exports = nextConfig;

export default eslintConfig;
