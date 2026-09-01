import type { BuildConfig } from 'bun'
import chalk from 'chalk'
import * as fs from 'fs'
import ImportFolder from './build-plugins/importFolder'

const DEV = process.argv.includes('--dev')
process.env.NODE_ENV = DEV ? 'development' : 'production'

const PACKAGE = JSON.parse(fs.readFileSync('./package.json', 'utf-8'))

/** The shebang + boxed license banner prepended to the CLI bundle. */
function createCliBanner() {
	const license = fs.readFileSync('./LICENSE').toString()
	let lines: string[] = [
		`v${PACKAGE.version as string}` + (DEV ? ' [DEV]' : ''),
		``,
		PACKAGE.description,
		``,
		`Created by ${PACKAGE.author.name as string}`,
		`(${PACKAGE.author.email as string}) [${PACKAGE.author.url as string}]`,
		``,
		`[ SOURCE ]`,
		`${PACKAGE.repository.url as string}`,
		``,
		`[ LICENSE ]`,
		...license.split('\n').map(v => v.trim()),
	]

	const maxLength = Math.max(...lines.map(line => line.length))
	const leftBuffer = Math.floor(maxLength / 2)
	const rightBuffer = Math.ceil(maxLength / 2)

	const header = '╭' + `─`.repeat(maxLength + 2) + '╮'
	const footer = '╰' + `─`.repeat(maxLength + 2) + '╯'

	lines = lines.map(v => {
		const div = v.length / 2
		const l = Math.ceil(leftBuffer - div)
		const r = Math.floor(rightBuffer - div)
		return '│ ' + ' '.repeat(l) + v + ' '.repeat(r) + ' │'
	})

	return (
		'#!/usr/bin/env node\n' + [header, ...lines, footer].map(v => `//?? ${v}`).join('\n') + '\n'
	)
}

const DEFINE: Record<string, string> = {
	ENVBENCH_INJECTED_VERSION: JSON.stringify(PACKAGE.version),
	// Folded so production bundles drop the dev-mode branches. Runtime-only env
	// vars (ENVBENCH_STORAGE_FOLDER, ...) are deliberately left untouched.
	'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV),
}

const SHARED: Partial<BuildConfig> = {
	target: 'node',
	define: DEFINE,
	minify: !DEV,
	sourcemap: DEV ? 'inline' : 'linked',
}

/** The single-file CLI bundle, with a shebang + banner. `terminal-kit` stays external. */
const CLI: BuildConfig = {
	...SHARED,
	entrypoints: ['./src/cli/index.ts'],
	outdir: './dist',
	naming: '[dir]/cli.js',
	format: 'cjs',
	banner: createCliBanner(),
	external: ['terminal-kit'],
	plugins: [ImportFolder()],
}

/**
 * The library entry, emitted as both CommonJS and ESM with every dependency
 * external - consumers resolve the format that fits them.
 */
const LIBRARY: BuildConfig = {
	...SHARED,
	entrypoints: ['./src/index.ts'],
	outdir: './dist',
	packages: 'external',
}

async function run(label: string, config: BuildConfig) {
	const start = Date.now()
	const result = await Bun.build(config)
	if (!result.success) {
		console.log(chalk.red(`❌ ${label} failed`))
		for (const log of result.logs) console.error(log)
		throw new AggregateError(result.logs, `${label} build failed`)
	}
	console.log(chalk.green(`✅ ${label} built in ${Date.now() - start}ms`))
}

async function buildAll() {
	console.log(chalk.gray(`🔨 Building${DEV ? ' [DEV]' : ''}...`))
	try {
		await Promise.all([
			run('cli', CLI),
			run('library (cjs)', { ...LIBRARY, format: 'cjs', naming: '[dir]/index.js' }),
			run('library (esm)', { ...LIBRARY, format: 'esm', naming: '[dir]/index.mjs' }),
		])
	} catch (err) {
		// In watch mode a failed build shouldn't kill the watcher.
		if (!DEV) throw err
		console.error(err)
	}
}

await buildAll()

if (DEV) {
	let queued: ReturnType<typeof setTimeout> | undefined
	fs.watch('./src', { recursive: true }, () => {
		clearTimeout(queued)
		queued = setTimeout(() => void buildAll(), 50)
	})
	console.log(chalk.gray('👀 Watching src/ for changes...'))
}
