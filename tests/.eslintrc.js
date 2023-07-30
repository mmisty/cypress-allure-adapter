// eslint-disable-next-line @typescript-eslint/no-var-requires
const original = require('./../.eslintrc.js');

module.exports = {
  ...original,
  extends: [...original.extends, 'plugin:jest/recommended'],
  rules: {
    ...original.rules,
    '@typescript-eslint/no-explicit-any': 'off',
    'jest/no-standalone-expect': 'off',
    '@typescript-eslint/no-non-null-assertion': 'off',
    'jest/expect-expect': 'off',
    'no-restricted-imports': [
      'error',
      {
        patterns: ['!**/src/**', '**/@src', '**/@src/*'],
      },
    ],
  },
};
