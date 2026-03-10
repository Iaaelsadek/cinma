module.exports = {
  extends: ['stylelint-config-standard', 'stylelint-config-recommended-scss'],
  plugins: ['stylelint-order'],
  rules: {
    'order/properties-alphabetical-order': true,
    'at-rule-no-unknown': null,
    'scss/at-rule-no-unknown': true
  },
  ignoreFiles: ['**/node_modules/**', 'dist/**']
};