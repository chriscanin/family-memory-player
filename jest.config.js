/**
 * The required unit test targets the pure domain logic in `src/core`, which has
 * no React Native dependencies, so the default jest-expo preset is all we need.
 */
module.exports = {
  preset: 'jest-expo',
  testMatch: ['**/src/**/__tests__/**/*.test.ts?(x)'],
};
