// eslint.config.mjs
import noFloatingPromise from 'eslint-plugin-no-floating-promise';
import promise from 'eslint-plugin-promise';
import security from 'eslint-plugin-security';
import globals from 'globals';


import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const espree = require('espree');

export default [
  // 通常の JS ファイル用設定
  {
    files: ['**/*.js'],
    ignores:[
      './node_modules/**',
      './public_admin/**',
      './public_html/**',
      './tools/**'
    ],
    languageOptions: {
      parser: espree,
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: 'module'
      },
      globals: {
        ...globals.node,
        ...globals.browser,
        ...globals.es6,
        ...globals.es2022,
      }
    },
    plugins: {
      'no-floating-promise': noFloatingPromise,
      promise,
      security
    },
    rules: {
      "no-undef": "error",
      "no-unused-vars": "off",
      "no-irregular-whitespace": "off",
      "no-floating-promise/no-floating-promise": "error",
      "promise/always-return": "error",
      "promise/no-return-wrap": "error",
      "promise/param-names": "error",
      "promise/catch-or-return": "error",
      "promise/no-nesting": "warn",
      "promise/no-return-in-finally": "warn",
      "security/detect-object-injection": "off"
    }
  }
];

