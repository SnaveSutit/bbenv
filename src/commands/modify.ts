import { NamedBlockbenchVersion } from '../blockbenchVersionManager'
import {
	environmentExists,
	getEnvironmentFile,
	setEnvironmentFile,
	validateBlockbenchLaunchArgs,
} from '../environmentHandler'
import { confirmPrompt, log } from '../util'

import { registerCommand } from '../commandRegistry'
import { rename } from './rename'

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

	if (!(await environmentExists(name))) {
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
	const envFile = await getEnvironmentFile(name)

	if (options.launchArgs !== undefined) {
		log()
			.green(`Setting launch arguments for `)
			.cyan(name)
			.green(` to `)
			.cyan(options.launchArgs)
			.green(`...\n`)
		const args = options.launchArgs.split(' ')
		validateBlockbenchLaunchArgs(args)
		envFile.launchArgs = args
	}

	if (options.version !== undefined) {
		log()
			.green(`Setting Blockbench version for `)
			.cyan(name)
			.green(` to `)
			.cyan(options.version)
			.green(`...\n`)
		envFile.blockbench_version = options.version
	}

	await setEnvironmentFile(name, envFile)
	log().green(`Environment `).cyan(name).green(` modified successfully!\n`)

	if (options.rename !== undefined) {
		await rename(name, options.rename, { confirm: true })
	}

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
