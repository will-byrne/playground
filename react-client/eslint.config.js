// For more info, see https://github.com/storybookjs/eslint-plugin-storybook#configuration-flat-config-format

import js from "@eslint/js";
import reactDom from "eslint-plugin-react-dom";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import reactX from "eslint-plugin-react-x";
import globals from "globals";
import tseslint from "typescript-eslint";

export default tseslint.config(
	{ ignores: ["dist"] },
	{
		extends: [js.configs.recommended, ...tseslint.configs.recommended],
		files: ["**/*.{ts,tsx}"],
		languageOptions: {
			ecmaVersion: 2020,
			globals: globals.browser,
		},
		plugins: {
			"react-hooks": reactHooks,
			"react-refresh": reactRefresh,
			"react-x": reactX,
			"react-dom": reactDom,
		},
		rules: {
			// other rules...
			// Enable its recommended typescript rules
			...reactX.configs["recommended-typescript"].rules,
			...reactDom.configs.recommended.rules,
		},
	},
);
