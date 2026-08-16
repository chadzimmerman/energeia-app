/** @type {import('jest').Config} */
module.exports = {
  preset: 'jest-expo',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  // node_modules ships untranspiled ESM for the Expo and RN packages, so the
  // default ignore has to be narrowed rather than removed.
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@sentry/react-native|native-base|react-native-svg|@supabase/.*)',
  ],
  collectCoverageFrom: [
    'utils/**/*.{ts,tsx}',
    'components/**/*.{ts,tsx}',
    'contexts/**/*.{ts,tsx}',
    'data/**/*.{ts,tsx}',
    '!**/*.d.ts',
  ],
  // A ratchet, not a target. Raise these as a tier lands; never lower them.
  // See docs/TESTING.md for the schedule and why it stops at 85.
  //
  // Note: Jest removes files matched by a path threshold from the global group,
  // so "global" here covers components and contexts only. It reads lower than
  // the headline number in the coverage table, and that is expected.
  coverageThreshold: {
    global: { statements: 50, branches: 50, functions: 40, lines: 50 },
    './utils/': { statements: 95, branches: 90, functions: 95, lines: 95 },
    './data/': { statements: 95, branches: 95, functions: 95, lines: 95 },
  },
  testPathIgnorePatterns: ['/node_modules/', '/ios/', '/android/'],
};
