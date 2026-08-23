import js from "@eslint/js";
import tseslint from "@typescript-eslint/eslint-plugin";
import tsparser from "@typescript-eslint/parser";
import prettierConfig from "eslint-config-prettier";
import prettier from "eslint-plugin-prettier";
import globals from "globals";

/** @type {import('eslint').Linter.Config[]} */
export default [
  js.configs.recommended,
  {
    files: ["**/*.{js,mjs,cjs,ts,tsx}"],
    languageOptions: {
      parser: tsparser,
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: "module",
      },
      globals: {
        ...globals.node,
      },
    },
    plugins: {
      "@typescript-eslint": tseslint,
      prettier: prettier,
    },
    rules: {
      ...prettierConfig.rules,
      // Prettier formatting
      "prettier/prettier": "error",

      // Security rules - prevent vulnerabilities
      "no-eval": "error",
      "no-implied-eval": "error",
      "no-new-func": "error",
      "no-script-url": "error",

      // Memory leaks and async issues (disabled - requires type info)
      // Enable these only in projects with parserOptions.project configured in their local configs
      "@typescript-eslint/no-floating-promises": "off",
      "@typescript-eslint/no-misused-promises": "off",
      "@typescript-eslint/await-thenable": "off",

      // Critical bugs - undefined variables
      // no-undef disabled - TypeScript/JavaScript compilers handle this
      "no-undef": "off",
      "no-unused-vars": "off", // Use TypeScript version instead
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          ignoreRestSiblings: true,
        },
      ],

      // Basic TypeScript safety (disabled - not security critical)
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/ban-ts-comment": "off",

      // Everything else is off - keep it simple
      "@typescript-eslint/adjacent-overload-signatures": "off",
      "@typescript-eslint/no-array-constructor": "off",
      "@typescript-eslint/no-duplicate-enum-values": "off",
      "@typescript-eslint/no-empty-object-type": "off",
      "@typescript-eslint/no-extra-non-null-assertion": "off",
      "@typescript-eslint/no-misused-new": "off",
      "@typescript-eslint/no-namespace": "off",
      "@typescript-eslint/no-non-null-asserted-optional-chain": "off",
      "@typescript-eslint/no-this-alias": "off",
      "@typescript-eslint/no-unnecessary-type-constraint": "off",
      "@typescript-eslint/no-unsafe-declaration-merging": "off",
      "@typescript-eslint/no-unsafe-enum-comparison": "off",
      "@typescript-eslint/prefer-as-const": "off",
      "@typescript-eslint/prefer-namespace-keyword": "off",
      "@typescript-eslint/triple-slash-reference": "off",
      "@typescript-eslint/explicit-function-return-type": "off",
      "@typescript-eslint/explicit-module-boundary-types": "off",
      "no-console": "off", // Allow console.log for debugging
    },
  },
  {
    ignores: [
      "dist",
      "node_modules",
      "*.js",
      "*.mjs",
      ".next",
      "build",
      "next-env.d.ts",
      "**/prisma/generated",
      "**/prisma/generated/**",
    ],
  },
];
