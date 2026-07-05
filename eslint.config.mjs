// @ts-check
import js from '@eslint/js';
import tseslint from '@typescript-eslint/eslint-plugin';
import tsparser from '@typescript-eslint/parser';

export default [
  js.configs.recommended,
  {
    files: ['**/*.ts'],
    languageOptions: {
      parser: tsparser,
      parserOptions: {
        project: true,
        sourceType: 'module',
      },
    },
    plugins: {
      '@typescript-eslint': tseslint,
    },
    rules: {
      ...tseslint.configs.recommended.rules,
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/explicit-function-return-type': 'off',
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@anthropic-ai/*', 'openai', '@google/*'],
              message:
                'Provider SDKs may only be imported inside packages/core/src/router/providers/**. See Document 2, Section 4.',
            },
            {
              group: ['@prisma/client'],
              message:
                "Prisma may only be imported inside apps/backend/src/di, apps/backend Repository implementations, and packages/core/src/memory/prisma-memory.repository.ts (the Memory module's own Repository implementation). See Document 2, Section 4.",
            },
          ],
        },
      ],
    },
  },
  {
    ignores: ['**/dist/**', '**/build/**', '**/.turbo/**', '**/node_modules/**', '**/*.dart'],
  },
];
