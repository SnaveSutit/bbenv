import { registerCommand } from '../commandRegistry'
import { validateEnvironmentName } from '../../core/environments'
import { confirmPrompt, log } from '../output'
import { getEnvbench } from '../run'

export async function rename(name: string, newName: string, options: { confirm?: true }) {
	if (name === newName) {
		log().yellow('The new name is the same as the current name! No changes made.\n')
		process.exit(0)
	}

	validateEnvironmentName(newName)
	const eb = getEnvbench()
	if ((await eb.environmentExists(name)) === false) {
		log().red(`Environment `).cyan(name).red(` does not exist!\n`)
		process.exit(1)
	}
	if ((await eb.environmentExists(newName)) !== false) {
		log().red(`Environment `).cyan(newName).red(` already exists!\n`)
		process.exit(1)
	}
	if (!options.confirm) {
		log()
			.yellow(`Are you sure you want to rename the environment `)
			.cyan(name)
			.yellow(` to `)
			.cyan(newName)
			.yellow(`? [y/n]\n`)
		if (!(await confirmPrompt())) {
			log().red('Operation cancelled!\n')
			process.exit(0)
		}
	}
	log().green(`Renaming environment `).cyan(name).green(` to `).cyan(newName).green(`...\n`)
	await eb.renameEnvironment(name, newName)
	log().green(`Environment renamed successfully!\n`)
}

registerCommand(program => {
	program
		.command('rename')
		.description('rename an environment')
		.argument('<name>', 'name of the environment to rename')
		.argument('<newName>', 'new name of the environment')
		.option('-c, --confirm', 'skip confirmation prompt')
		.action(rename)
})
