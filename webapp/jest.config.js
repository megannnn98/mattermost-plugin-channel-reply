module.exports = {
    clearMocks: true,
    collectCoverageFrom: [
        'src/**/*.{ts,tsx}',
        '!src/**/*.d.ts',
        '!src/test/**',
    ],
    moduleNameMapper: {
        '\\.scss$': '<rootDir>/src/test/styleMock.ts',
    },
    setupFilesAfterEnv: ['<rootDir>/src/test/setup.ts'],
    testEnvironment: 'jsdom',
    transform: {
        '^.+\\.(ts|tsx)$': ['ts-jest', {tsconfig: 'tsconfig.json'}],
    },
};
