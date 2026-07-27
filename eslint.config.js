import js from '@eslint/js';
import globals from 'globals';

export default [
  {
    ignores: [
      '**/node_modules/**',
      '**/storage/**',
      'public/vendor/**'
    ]
  },
  js.configs.recommended,
  {
    files: [
      '**/*.js',
      '**/*.ts'
    ],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.node
      }
    },
    rules: {
      'no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_'
        }
      ]
    }
  },
  {
    files: [
      'public/js/**/*.ts'
    ],
    languageOptions: {
      globals: {
        ...globals.browser,
        ym: 'readonly'
      }
    }
  }
];
