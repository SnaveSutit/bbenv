import { validateEnvironmentName } from '../../core/environments'
import { parseBlockbenchLaunchArgs } from '../../core/launchArgs'
import type { NamedBlockbenchVersion } from '../../core/types'
import { registerCommand } from '../commandRegistry'
import { confirmPrompt, downloadProgressHooks, log } from '../output'
import { getEnvbench } from '../run'

export async function create(
	name: string,
	options: { force?: true; confirm?: true; launchArgs?: string; version: NamedBlockbenchVersion }
) {
	validateEnvironmentName(name)
	const eb = getEnvbench()

	const alreadyExists = (await eb.environmentExists(name)) !== false
	if (alreadyExists && !options.force) {
		log().red(`Environment `).cyan(name).red(` already exists!\n`)
		process.exit(1)
	}

	if (alreadyExists) {
		if (!options.confirm) {
			log().yellow(`An Environment named `).cyan(name).yellow(` already exists.\n`)
			log().yellow(`Do you want to delete it and create a new one? [y/n]\n`)
			if (!(await confirmPrompt())) {
				log().red('Operation cancelled!\n')
				process.exit(0)
			}
		}
		log().red(`Deleting existing environment `).cyan(name).red(`...\n`)
	} else if (!options.confirm) {
		log().yellow(`Create a new environment named `).cyan(name).yellow(`? [y/n]\n`)
		if (!(await confirmPrompt())) {
			log().red('Operation cancelled!\n')
			process.exit(0)
		}
	}

	if (!(await eb.isOnline())) {
		log().yellow('You are offline, so the Blockbench version cannot be validated.\n')
	} else if (!(await eb.isValidBlockbenchVersion(options.version))) {
		log().red(`Invalid Blockbench version `).cyan(options.version).red(`!\n`)
		process.exit(1)
	}

	log().green(`Creating new environment `).cyan(name).green(`...\n`)
	await eb.createEnvironment(
		name,
		{
			blockbenchVersion: options.version,
			launchArgs: parseBlockbenchLaunchArgs(options.launchArgs ?? ''),
			force: true,
		},
		downloadProgressHooks()
	)

	log().green('Environment created successfully!\n')
	process.exit(0)
}

registerCommand(program => {
	program
		.command('create')
		.usage('<name> [options]')
		.description('create a new environment')
		.argument('<name>', 'the name of the new environment')
		.option('--confirm', 'skip confirmation prompts')
		.option('-f, --force', 'overwrite the environment if it already exists')
		.option('-v, --version <version>', 'the Blockbench version to use', 'latest')
		.option(
			'-a, --launch-args "<arguments>"',
			'additional arguments to pass to Blockbench when launching the environment'
		)
		.action(create)
})
