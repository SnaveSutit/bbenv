import { registerCommand } from '../commandRegistry'
import { log } from '../output'
import { getEnvbench } from '../run'

export async function blockbenchVersions(options: { prune?: true }) {
	const eb = getEnvbench()

	if (options.prune) {
		log().green(`Pruning Blockbench versions...\n`)
		const removed = await eb.pruneVersions()
		for (const version of removed) {
			log().red(`Removed Blockbench version `).cyan(version).red(`\n`)
		}
	}

	log().green(`Installed Blockbench versions:\n`)
	for (const version of await eb.listInstalledVersions()) {
		log().cyan(version).green(`\n`)
	}
}

registerCommand(program => {
	program
		.command('blockbench-versions')
		.alias('bb-versions')
		.usage('[options]')
		.description('list the locally installed versions of Blockbench')
		.option(
			'-p, --prune',
			"uninstall any versions that aren't being used in an existing Environment from the cache"
		)
		.action(blockbenchVersions)
})
