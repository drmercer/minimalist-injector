module.exports = {
  globals: {
    "ts-jest": {
      "tsconfig": "./tsconfig.jest.json"
    }
  },
  transform: {
    ".ts": "ts-jest"
  },
  testRegex: "\\.spec\\.ts$",
  moduleFileExtensions: [
    "ts",
    "js"
  ]
}
