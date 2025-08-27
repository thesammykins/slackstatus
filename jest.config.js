export default {
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.test.js'],
  collectCoverageFrom: ['src/**/*.js', 'cli/**/*.js', '!**/node_modules/**', '!**/coverage/**'],
  transform: {},
};
