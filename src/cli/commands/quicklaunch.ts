import { parseBlockbenchLaunchArgs } from '../../core/launchArgs'
import type { NamedBlockbenchVersion } from '../../core/types'
import { registerCommand } from '../commandRegistry'
import { downloadProgressHooks, log } from '../output'
import { getEnvbench, runToExit } from '../run'

/**
 * Create a temporary environment for a given Blockbench version and launch it.
 */
export async function quicklaunch(
	version: NamedBlockbenchVersion,
	options?: { launchArgs?: string; reset?: boolean }
) {
	const eb = getEnvbench()
	if ((await eb.isOnline()) && !(await eb.isValidBlockbenchVersion(version))) {
		log().red(`Invalid Blockbench version `).cyan(version).red(`!\n`)
		process.exit(1)
	}

	if (options?.reset) {
		log().yellow(`Resetting environment for Blockbench ${version}...\n`)
	}
	log().green(`Quicklaunching Blockbench `).cyan(version).green(`...\n`)

	const child = await eb.quicklaunch(
		version,
		{
			extraArgs: parseBlockbenchLaunchArgs(options?.launchArgs ?? ''),
			reset: options?.reset,
		},
		downloadProgressHooks()
	)
	await runToExit(child)
}

registerCommand(program => {
	program
		.command('quicklaunch')
		.usage('<version> [options]')
		.description('creates and launches a temporary environment for a given Blockbench version')
		.argument('<version>', 'version of Blockbench to use')
		.option('-a, --launch-args "<arguments>"', 'additional arguments to pass to Blockbench')
		.option('-r, --reset', 'erase any existing environment for this version before launching')
		.action(quicklaunch)
})
