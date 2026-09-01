import { registerCommand } from '../commandRegistry'
import { parseBlockbenchLaunchArgs } from '../../core/launchArgs'
import { downloadProgressHooks, log } from '../output'
import { getEnvbench, runToExit } from '../run'

/**
 * Start an environment.
 */
export async function launch(name: string, options?: { launchArgs?: string }) {
	const eb = getEnvbench()
	if ((await eb.environmentExists(name)) === false) {
		log().red(`Environment `).cyan(name).red(` does not exist!\n`)
		process.exit(1)
	}

	log().green(`Launching environment `).cyan(name).green(`...\n`)
	const child = await eb.launch(
		name,
		{ extraArgs: parseBlockbenchLaunchArgs(options?.launchArgs ?? '') },
		downloadProgressHooks()
	)
	await runToExit(child)
}

registerCommand(program => {
	program
		.command('launch')
		.alias('start')
		.usage('<name> [options]')
		.description('launch an existing environment')
		.argument('<name>', 'name of the environment to launch')
		.option('-a, --launch-args "<arguments>"', 'additional arguments to pass to Blockbench')
		.action(launch)
})
