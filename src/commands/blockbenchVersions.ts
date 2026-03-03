import { readdir } from 'fs/promises'
import { pruneBlockbenchVersions, ResolvedBlockbenchVersion } from '../blockbenchVersionManager'
import { registerCommand } from '../commandRegistry'
import { log } from '../util'

type PortableFileName = `blockbench-${ResolvedBlockbenchVersion}.${'exe' | 'dmg' | 'AppImage'}`

export async function blockbenchVersions(options: { prune?: true }) {
	if (options.prune) {
		log().green(`Pruning Blockbench versions...\n`)
		await pruneBlockbenchVersions()
	}

	log().green(`Installed Blockbench versions:\n`)
	const portableFiles = (await readdir(
		process.env.BLOCKBENCH_PORTABLES_CACHE
	)) as PortableFileName[]
	for (const portable of portableFiles) {
		const version = portable.replace(/^blockbench(?:-|_)|\.exe|\.dmg|\.AppImage$/gi, '')
		log().cyan(version).green(` (${portable})\n`)
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
