import { FlatCompat } from "@eslint/eslintrc";
import { fileURLToPath } from "node:url";

const compat = new FlatCompat({ baseDirectory: fileURLToPath(new URL(".", import.meta.url)) });

const config = [
  { ignores: ["node_modules/**", ".next/**", "out/**", "build/**", "next-env.d.ts", ".agents/**", ".claude/**", ".gstack/**", "artifacts/**"] },
  ...compat.extends("next/core-web-vitals", "next/typescript")
];

export default config;
