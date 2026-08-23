import { FlatCompat } from "@eslint/eslintrc";
import { dirname } from "path";
import { fileURLToPath } from "url";
import baseConfig from "./eslint.config.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

/** @type {import('eslint').Linter.Config[]} */
export default [
  ...baseConfig,
  ...compat.extends("eslint-config-next"),
  {
    files: ["**/*.{js,jsx,ts,tsx}"],
    languageOptions: {
      globals: {
        React: "readonly",
        JSX: "readonly",
      },
    },
    rules: {
      "react/react-in-jsx-scope": "off",
      "react/prop-types": "off",
      // Keep security and memory leak rules from base config
      // Disable type-aware rules that require project configuration
      "@typescript-eslint/no-unsafe-enum-comparison": "off",
      "@typescript-eslint/no-unsafe-declaration-merging": "off",
      // Let eslint-config-next handle no-unused-vars to avoid version conflicts
      "@typescript-eslint/no-unused-vars": "off",
    },
  },
  {
    ignores: ["next-env.d.ts", "**/prisma/generated", "**/prisma/generated/**"],
  },
];
