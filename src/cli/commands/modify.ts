import { parseBlockbenchLaunchArgs } from '../../core/launchArgs'
import type { NamedBlockbenchVersion } from '../../core/types'
import { registerCommand } from '../commandRegistry'
import { confirmPrompt, log } from '../output'
import { getEnvbench } from '../run'

export async function modify(
	name: string,
	options: {
		force?: true
		rename?: string
		launchArgs?: string
		version?: NamedBlockbenchVersion
	}
) {
	if (Object.keys(options).length === 0) {
		log().yellow('No modifications specified! Use --help for usage information.\n')
		process.exit(1)
	}

	const eb = getEnvbench()
	if ((await eb.environmentExists(name)) === false) {
		log().red(`Environment `).cyan(name).red(` does not exist!\n`)
		process.exit(1)
	}

	if (!options.force) {
		log()
			.yellow(`Are you sure you want to modify the environment `)
			.cyan(name)
			.yellow(` with the following changes?\n`)
		if (options.launchArgs !== undefined) {
			log().yellow(`- Launch arguments: `).cyan(options.launchArgs).yellow(`\n`)
		}
		if (options.version !== undefined) {
			log().yellow(`- Blockbench version: `).cyan(options.version).yellow(`\n`)
		}
		if (options.rename !== undefined) {
			log().yellow(`- Rename to `).cyan(options.rename).yellow(`\n`)
		}
		log().yellow(`Confirm? [y/n]\n`)
		if (!(await confirmPrompt())) {
			log().red('Operation cancelled!\n')
			process.exit(0)
		}
	}

	log().green(`Modifying Environment `).cyan(name).green(`...\n`)
	await eb.modifyEnvironment(name, {
		launchArgs:
			options.launchArgs !== undefined
				? parseBlockbenchLaunchArgs(options.launchArgs)
				: undefined,
		blockbenchVersion: options.version,
		rename: options.rename,
	})
	log().green(`Environment `).cyan(name).green(` modified successfully!\n`)

	process.exit(0)
}

registerCommand(program => {
	program
		.command('modify')
		.usage('<name> [options]')
		.description('modify an environment')
		.argument('<name>', 'name of the environment to modify')
		.option('-f, --force', 'modify the environment without confirmation')
		.option('-r, --rename <newName>', 'rename the environment to <newName>')
		.option('-v, --version <version>', 'change the Blockbench version of the environment')
		.option(
			'-a, --launch-args <arguments>',
			'set the launch arguments to pass to Blockbench when launching the environment'
		)
		.action(modify)
})
