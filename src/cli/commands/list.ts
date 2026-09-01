import { terminal as $ } from 'terminal-kit'
import { registerCommand } from '../commandRegistry'
import { log } from '../output'
import { getEnvbench } from '../run'

export async function list(options: { long?: true }) {
	const environments = await getEnvbench().listEnvironments()
	const entries = Object.entries(environments)
	if (entries.length === 0) {
		log().red('No environments found!\n')
		log().yellow('Create a new environment with the "create <name>" command.\n')
		process.exit(0)
	}

	log().green('Available Environments:\n')

	if (options.long) {
		for (const [name, status] of entries) {
			if (status === 'folder') {
				$.gray(' ').yellow(name, ' (Missing environment file!)\n')
				continue
			}
			if (status === false) {
				$.gray(' ').yellow(name, ' (Missing environment folder!)\n')
				continue
			}
			$.gray(' ').green(name, '\n').gray(' ├ Blockbench Version: ').cyan(status.blockbench_version, '\n')
			if (status.launchArgs && status.launchArgs.length > 0) {
				$.gray(' ├ Launch Args: ').cyan(status.launchArgs.join(' '), '\n')
			}
			$.gray(' └ Envbench Version: ').cyan(status.envbench_version, '\n')
		}
		return
	}

	for (const [index, [name, status]] of entries.entries()) {
		$.gray(index === entries.length - 1 ? '└ ' : '├ ')
		if (status === 'folder') {
			$.yellow(name, ' (Missing environment file!)\n')
		} else if (status === false) {
			$.yellow(name, ' (Missing environment folder!)\n')
		} else {
			$.green(name, '\n')
		}
	}
}

registerCommand(program => {
	program
		.command('list')
		.usage('[options]')
		.description('list all available environments')
		.option('-l, --long', 'show detailed information about each environment')
		.action(list)
})
