module.exports = {
	root: true,
	env: {
		node: true,
	},
	parserOptions: {
		ecmaVersion: 2022,
	},
	extends: ['airbnb-base'],
	globals: {
		Atomics: 'readonly',
		SharedArrayBuffer: 'readonly',
	},
	rules: {
		indent: [
			'error',
			'tab',
		],
		'no-tabs': 0,
		'no-console': 0,
		'no-bitwise': ['error', {
			allow: ['>>', '>>='],
		}],
		'max-len': ['error', 120],
		'class-methods-use-this': 0,
	},
};
