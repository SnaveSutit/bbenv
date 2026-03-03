import { rename as fsRename } from 'fs/promises'
import { join } from 'path'
import { registerCommand } from '../commandRegistry'
import {
	environmentExists,
	getEnvironmentFile,
	setEnvironmentFile,
	validateEnvironmentName,
} from '../environmentHandler'
import { confirmPrompt, log } from '../util'

export async function rename(name: string, newName: string, options: { confirm?: true }) {
	if (name === newName) {
		log().yellow('The new name is the same as the current name! No changes made.\n')
		process.exit(0)
	}

	validateEnvironmentName(newName)
	if (!(await environmentExists(name))) {
		log().red(`Environment `).cyan(name).red(` does not exist!\n`)
		process.exit(1)
	}
	if (await environmentExists(newName)) {
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
	const oldPath = join(process.env.ENVBENCH_STORAGE_FOLDER, name)
	const newPath = join(process.env.ENVBENCH_STORAGE_FOLDER, newName)
	await fsRename(oldPath, newPath).catch(err => {
		log().red(`Failed to rename environment:\n`)
		log().error(err)
		process.exit(1)
	})
	const envFile = await getEnvironmentFile(newName)
	envFile.name = newName
	await setEnvironmentFile(newName, envFile)
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
