// ESLint v9+ uses the new "flat config" system by default.
// This file adapts our legacy .eslintrc.js so CI can run linting strictly.

const path = require('path');
const js = require('@eslint/js');
const { FlatCompat } = require('@eslint/eslintrc');

const compat = new FlatCompat({
  baseDirectory: __dirname,
  recommendedConfig: js.configs.recommended,
  allConfig: js.configs.all
});

// .eslintrc.js exports a classic config object
// FlatCompat converts it to flat-config format.
module.exports = [
  ...compat.config(require(path.join(__dirname, '.eslintrc.js')))
];
