import { ENVBENCH_VERSION } from '../../core/version'
import { registerCommand } from '../commandRegistry'
import { log } from '../output'

registerCommand(program => {
	program
		.command('version')
		.alias('v')
		.description('Print the version of EnvBench.')
		.action(() => {
			log().green('v', ENVBENCH_VERSION, '\n')
		})
})
