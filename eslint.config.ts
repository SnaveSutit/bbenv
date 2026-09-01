import tsESLint, { type ConfigWithExtends } from 'typescript-eslint'
import type { NamingConventionRule } from './.scripts/tslintNamingConventionRule'

console.log(`[${new Date().toLocaleTimeString()}] Loading ESLint config`)

const IGNORE_PATTERNS = [
	'.DS_Store',
	'.env',
	'.env.*',
	'.github',
	'.vscode',
	'**/node_modules/**',

	// Blockbench Plugin Template
	'dist/**/*',

	// Ignore files for PNPM, NPM and YARN
	'pnpm-lock.yaml',
	'package-lock.json',
	'yarn.lock',
]

const CUSTOM_RULES: ConfigWithExtends['rules'] = {
	// ESLint
	semi: ['error', 'never'],
	'prefer-const': 'warn',
	'no-fallthrough': 'off',
	'no-mixed-spaces-and-tabs': 'warn',
	'no-unreachable': 'warn',
	'@typescript-eslint/no-unused-vars': [
		'warn',
		{
			vars: 'local',
			args: 'after-used',
			argsIgnorePattern: '^_',
			ignoreRestSiblings: true,
		},
	],
	// TypeScript
	'@typescript-eslint/no-explicit-any': 'off',
	'@typescript-eslint/no-floating-promises': ['error', { ignoreVoid: true }],
	'@typescript-eslint/array-type': ['warn', { default: 'array-simple' }],
	'@typescript-eslint/consistent-indexed-object-style': ['warn', 'record'],
	'@typescript-eslint/consistent-generic-constructors': 'warn',
	'@typescript-eslint/no-namespace': 'off',
	'@typescript-eslint/restrict-template-expressions': 'off',
	'@typescript-eslint/no-unsafe-member-access': 'off',
	'@typescript-eslint/no-unsafe-assignment': 'off',
	'@typescript-eslint/ban-ts-comment': 'off',
	'@typescript-eslint/require-await': 'warn',
	'@typescript-eslint/no-unsafe-call': 'off',
	'@typescript-eslint/unbound-method': 'off',
	'@typescript-eslint/no-non-null-assertion': 'off',
	'@typescript-eslint/triple-slash-reference': 'off',
	// Naming conventions
	'@typescript-eslint/naming-convention': [
		'warn',
		{
			selector: 'class',
			format: ['PascalCase'],
		},
		{
			selector: 'import',
			modifiers: ['default'],
			filter: {
				regex: 'v\\d+_\\d+_\\d+$',
				match: true,
			},
			custom: {
				match: true,
				regex: 'v\\d+_\\d+_\\d+$',
			},
			format: null,
		},
		{
			selector: ['import'],
			modifiers: ['default'],
			format: ['camelCase', 'PascalCase'],
		},
		{
			selector: ['classProperty', 'classMethod'],
			format: ['camelCase'],
		},
		{
			selector: ['classProperty', 'classMethod'],
			filter: {
				regex: '^_.*$',
				match: true,
			},
			prefix: ['_'],
			format: ['camelCase'],
		},
		{
			selector: 'typeProperty',
			format: null,
		},
		{
			selector: 'variable',
			modifiers: ['const', 'destructured'],
			format: null,
		},
		{
			selector: 'variable',
			modifiers: ['const', 'global'],
			leadingUnderscore: 'allow',
			format: ['UPPER_CASE'],
		},
		{
			selector: 'variable',
			modifiers: ['const', 'global'],
			types: ['function'],
			format: ['camelCase'],
		},
		{
			selector: 'variable',
			modifiers: ['const', 'global', 'exported'],
			types: ['boolean', 'array', 'string', 'boolean', 'number'],
			format: ['camelCase', 'UPPER_CASE'],
		},
		{
			selector: 'variableLike',
			format: ['camelCase'],
		},
		{ selector: 'interface', format: ['PascalCase'] },
		{ selector: 'typeLike', format: ['PascalCase'] },
		{ selector: 'objectLiteralProperty', format: null },
		{ selector: 'default', format: ['camelCase'] },
		{
			selector: 'parameter',
			modifiers: ['unused'],
			format: ['camelCase'],
			leadingUnderscore: 'allow',
		},
		{
			selector: 'parameter',
			format: ['camelCase'],
		},
		{
			selector: 'enumMember',
			format: ['UPPER_CASE'],
		},
	] satisfies NamingConventionRule,
}

export default tsESLint.config(
	{
		ignores: IGNORE_PATTERNS,
	},
	...tsESLint.configs.stylisticTypeChecked,
	{
		plugins: {
			'@typescript-eslint': tsESLint.plugin,
		},
	},
	{
		rules: CUSTOM_RULES,
	},
	{
		languageOptions: {
			parser: tsESLint.parser,
			parserOptions: {
				project: './tsconfig.json',
			},
			globals: {
				browser: true,
				node: true,
			},
		},
	},
	{
		languageOptions: {
			parserOptions: {
				projectService: true,
				tsconfigRootDir: __dirname,
			},
		},
		linterOptions: {
			reportUnusedDisableDirectives: true,
		},
	},
	{
		// `node:test`'s describe/it return promises that are meant to be ignored.
		files: ['**/*.test.ts'],
		rules: {
			'@typescript-eslint/no-floating-promises': 'off',
		},
	}
)
