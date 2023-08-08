// eslint-disable-next-line @typescript-eslint/no-var-requires
const orig = require('../.eslintrc.js');

module.exports = {
  ...orig,
  rules: {
    ...orig.rules,
    'no-restricted-imports': [
      'error',
      {
        patterns: ['**/src/**', '!**/@src', '!**/@src/*'],
      },
    ],
  },
};
