import { terminal as $ } from 'terminal-kit'
import { registerCommand } from '../commandRegistry'
import { log } from '../output'
import { getEnvbench } from '../run'

export async function info(name: string) {
	const eb = getEnvbench()
	if ((await eb.environmentExists(name)) === false) {
		log().red(`Environment `).cyan(name).red(` does not exist!\n`)
		process.exit(1)
	}
	const environment = await eb.getEnvironment(name)
	log().green(`Information about environment `).cyan(name).green(`:\n`)
	$.gray('├ ').green(`Name: `).cyan(name).green(`\n`)
	$.gray('├ ').green(`Blockbench version: `).cyan(environment.blockbench_version).green(`\n`)
	if (environment.launchArgs && environment.launchArgs.length > 0) {
		$.gray('├ ').green(`Launch arguments: `).cyan(environment.launchArgs.join(' ')).green(`\n`)
	} else {
		$.gray('├ ').green(`Launch arguments: `).cyan('none').red(`\n`)
	}
	$.gray('└ ').green(`EnvBench Version: `).cyan(environment.envbench_version).green(`\n`)
}

registerCommand(program => {
	program
		.command('info')
		.usage('[options]')
		.description('display information about a specific environment')
		.argument('<name>', 'name of the environment to display information about')
		.action(info)
})
