import js from '@eslint/js';
import { defineConfig, globalIgnores } from 'eslint/config';
import reactHooks from 'eslint-plugin-react-hooks';
import tseslint from 'typescript-eslint';

export default defineConfig(globalIgnores(['dist/']), js.configs.recommended, {
  files: ['**/*.{ts,tsx}'],
  extends: [tseslint.configs.recommended, reactHooks.configs.flat.recommended],
});
