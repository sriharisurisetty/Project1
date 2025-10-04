// @ts-check

import eslint from '@eslint/js';
import { defineConfig } from 'eslint/config';
import tseslint from 'typescript-eslint';

  
export default defineConfig(
  {
    ignores: ["dist", "node_modules"], // 👈 folders to ignore
  },
{
  extends: [
    eslint.configs.recommended,
    ...tseslint.configs.recommended,
  ],
});