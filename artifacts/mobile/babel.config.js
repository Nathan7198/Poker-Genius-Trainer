const path = require("path");

// pnpm hoists modules to the workspace root — resolve babel-preset-expo from there
const babelPresetExpo = path.resolve(
  __dirname,
  "../../node_modules/.pnpm/babel-preset-expo@54.0.11_@babel+core@7.29.0_@babel+runtime@7.29.2_expo@54.0.35_react-refresh@0.14.2/node_modules/babel-preset-expo"
);

module.exports = function (api) {
  api.cache(true);
  return {
    presets: [[babelPresetExpo, { unstable_transformImportMeta: true }]],
  };
};
