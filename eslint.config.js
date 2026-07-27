import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default [
  {
    ignores: [
      '**/node_modules/**',
      '**/storage/**',
      'public/vendor/**',
      'public/js/yandex-metrika.js'
    ]
  },

  js.configs.recommended,

  ...tseslint.configs.recommended,

  {
    files: ['**/*.ts'],
    languageOptions: {
      globals: {
        ...globals.node
      }
    },
    rules: {
      'no-unused-vars': 'off',

      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_'
        }
      ],

      '@typescript-eslint/consistent-type-imports': 'error'
    }
  },

  {
    files: ['public/js/**/*.ts'],
    languageOptions: {
      globals: {
        ...globals.browser,
        ym: 'readonly'
      }
    }
  }
];