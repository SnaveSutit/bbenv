import { terminal as $, type Terminal } from 'terminal-kit'

export async function updateOnlineStatus() {
	process.env.IS_ONLINE = await fetch('https://api.github.com')
		.then(() => 'TRUE')
		.catch(() => 'FALSE')
}

export function isOnline() {
	return process.env.IS_ONLINE
}

export function log() {
	return $.gray('[').blue('EnvBench').gray('] ')
}

/**
 * Expands environment variables in a string.
 * @example
 * expandEnv('%APPDATA%/EnvBench') // C:\Users\<username>\AppData\Roaming\EnvBench
 */
export function expandEnv(str: string): string {
	return str.replace(/%([^%]+)%/g, (original, matched) => {
		const r = process.env[matched]
		return r ?? ''
	})
}

export async function confirmPrompt() {
	return await $.yesOrNo({
		yes: ['y', 'ENTER'],
		no: ['n', 'ESCAPE'],
	}).promise
}

export async function printError(toTry: Promise<any>, message: string) {
	try {
		await toTry
	} catch (e: any) {
		log().red(message, ':\n', e.message, '\n')
		process.exit(1)
	}
}

const SPINNER_CHARS = ['∙∙∙', '●∙∙', '∙●∙', '∙∙●', '∙●∙', '●∙∙', '∙∙∙', '∙∙∙']

interface CustomSpinnerOptions<T extends any> {
	style: Terminal
	waitFor: Promise<T> | (() => Promise<T>)
	prefix?: () => Terminal | void
	suffix?: () => Terminal | void
	interval?: number
}

/**
 * Creates a custom spinner in the terminal.
 * @param style The style of the spinner.
 * @param waitFor The promise to wait for.
 * @param interval The interval in milliseconds between each spinner update.
 * @returns A promise that resolves when {@link waitFor} resolves.
 */
export function customSpinner<T extends any>({
	style,
	waitFor,
	interval = 200,
	prefix,
	suffix,
}: CustomSpinnerOptions<T>): Promise<T> {
	let i = 0
	return new Promise<T>((resolve, reject) => {
		const intervalID = setInterval(() => {
			$.getCursorLocation((err, x, y) => {
				if (err) {
					reject(err)
				}
				const char = SPINNER_CHARS[i]
				$.moveTo(0, y).eraseLineBefore()
				prefix?.()
				style(char)
				suffix?.()
				i = (i + 1) % SPINNER_CHARS.length
				$.moveTo(x, y)
			})
		}, interval)
		// Wait for the passed in promise to resolve
		const promise = waitFor instanceof Function ? waitFor() : waitFor
		void promise.then((...args) => {
			clearInterval(intervalID)
			$('\n')
			resolve(...args)
		})
	})
}

export function formatBytes(bytes: number): string {
	return (bytes / (1024 * 1024)).toFixed(2) + 'MB'
}

const LAUNCH_ARG_REGEX = /(".+?"|'.+?'|[^ =]+)+/g

export function parseBlockbenchLaunchArgs(strArgs: string): string[] {
	const matches = strArgs.match(LAUNCH_ARG_REGEX)
	if (!matches) {
		return []
	}
	return matches.slice()
}
