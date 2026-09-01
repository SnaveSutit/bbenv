import type { ChildProcess } from 'node:child_process'
import { terminal as $ } from 'terminal-kit'
import { Envbench } from '../core/envbench'
import { EnvbenchError, LaunchError } from '../core/errors'
import { log } from './output'

let instance: Envbench | undefined

/** Treats an unset or blank environment variable as absent. */
function envPath(value: string | undefined): string | undefined {
	return value && value.trim() !== '' ? value : undefined
}

/**
 * The single {@link Envbench} instance for this CLI invocation. Honours the
 * `ENVBENCH_STORAGE_FOLDER` and `BLOCKBENCH_PORTABLES_CACHE` environment
 * variables, falling back to the defaults.
 */
export function getEnvbench(): Envbench {
	return (instance ??= new Envbench({
		storageDir: envPath(process.env.ENVBENCH_STORAGE_FOLDER),
		portablesCache: envPath(process.env.BLOCKBENCH_PORTABLES_CACHE),
	}))
}

/**
 * Pipes a launched Blockbench process to the terminal and resolves when it
 * closes. Rejects with a {@link LaunchError} if it fails to spawn or exits
 * non-zero.
 */
export function runToExit(child: ChildProcess): Promise<void> {
	child.stdout?.on('data', data => $(String(data)))
	child.stderr?.on('data', data => $(String(data)))

	return new Promise<void>((resolve, reject) => {
		child.on('spawn', () => log().green('Blockbench launched successfully.\n'))
		child.on('error', err =>
			reject(new LaunchError(`Failed to launch Blockbench: ${err.message}`))
		)
		child.on('close', code => {
			log().green('Blockbench closed.\n')
			if (code && code !== 0) {
				reject(new LaunchError(`Blockbench exited with code ${code}`))
			} else {
				resolve()
			}
		})
	})
}

/**
 * Prints an {@link EnvbenchError} as a friendly message and exits; rethrows
 * anything else for the top-level crash handler.
 */
export function handleCliError(err: unknown): never {
	if (err instanceof EnvbenchError) {
		$('\n')
		log().red(err.message, '\n')
		process.exit(1)
	}
	throw err
}
