module.exports = {
  env: {
    es2021: true,
  },
  extends: ["standard-with-typescript", "plugin:react/recommended", "prettier"],
  overrides: [
    {
      env: {
        node: true,
      },
      files: [".eslintrc.{js,cjs}"],
      parserOptions: {
        sourceType: "script",
      },
    },
  ],
  parserOptions: {
    ecmaVersion: "latest",
    sourceType: "module",
  },
  plugins: ["react"],
  rules: {
    "@typescript-eslint/space-before-function-paren": "off",
    "@typescript-eslint/semi": "off",
    "@typescript-eslint/quotes": ["error", "double"],
    "@typescript-eslint/strict-boolean-expressions": "off",
    "@typescript-eslint/no-misused-promises": "off",
  },
};
