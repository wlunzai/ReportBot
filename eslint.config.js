export default [
  {
    files: ['src/**/*.js'],
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: 'module',
    },
    rules: {
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      'no-console': 'off',
      'semi': ['error', 'always'],
    },
  },
  {
    ignores: ['node_modules/', 'dist/'],
  },
];
