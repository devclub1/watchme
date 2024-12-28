/** @type {import('ts-jest').JestConfigWithTsJest} **/
export default {
  testEnvironment: "node",
  transform: {
    "^.+.tsx?$": ["ts-jest", {}],
  },
  collectCoverageFrom: [
    "src/**/*.ts", 
    "!src/app.ts"
  ],
};