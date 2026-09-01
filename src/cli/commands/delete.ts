import { registerCommand } from '../commandRegistry'
import { confirmPrompt, log } from '../output'
import { getEnvbench } from '../run'

export async function remove(name: string, options: { confirm?: true }) {
	const eb = getEnvbench()
	if ((await eb.environmentExists(name)) === false) {
		log().red(`Environment `).cyan(name).red(` does not exist!\n`)
		process.exit(1)
	}
	if (!options.confirm) {
		log().yellow(`Are you sure you want to delete environment `).cyan(name).yellow(`? [y/n]\n`)
		if (!(await confirmPrompt())) {
			log().red('Operation cancelled!\n')
			process.exit(0)
		}
	}
	log().green(`Deleting environment `).cyan(name).green(`...\n`)
	await eb.deleteEnvironment(name)
	log().green(`Environment deleted successfully!\n`)
}

registerCommand(program => {
	program
		.command('delete')
		.alias('remove')
		.usage('<name> [options]')
		.description('remove an environment')
		.argument('<name>', 'name of the environment to remove')
		.option('-c, --confirm', 'remove the environment without confirmation')
		.action(remove)
})
