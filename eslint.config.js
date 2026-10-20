import js from "@eslint/js";
import globals from "globals";

export default [
  // 1. Tell ESLint which folders or files to completely ignore
  {
    ignores: ["node_modules/", "dist/", "build/"]
  },
  
  // 2. Configure linting rules for your JavaScript files
  {
    files: ["**/*.js", "**/*.mjs"],
    languageOptions: {
      ecmaVersion: "latest",      // Allows modern JS syntax (ES6, Async/Await, etc.)
      sourceType: "module",       // Allows the use of import/export statements
      globals: {
        ...globals.browser,       // Recognizes browser variables (window, document, alert)
        ...globals.node,          // Recognizes Node.js variables (process, require, __dirname)
      },
    },
    // 3. Load ESLint's recommended base rules
    rules: {
      ...js.configs.recommended.rules,
      
      // 4. Add your own custom rule overrides here:
      "no-unused-vars": "warn",   // Warns you about variables declared but never used
      "no-undef": "error",        // Triggers an error if you use an undeclared variable
      "eqeqeq": "error",          // Forces the use of === and !== instead of == and !=
      "no-console": "off",        // Set to "warn" or "error" if you want to block console.log statements
    },
  },
];
