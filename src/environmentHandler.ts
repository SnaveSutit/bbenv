import { mkdir, readFile, rm, writeFile } from 'fs/promises'
import { join } from 'path'
import { terminal as $ } from 'terminal-kit'
import { version } from '../package.json'
import { NamedBlockbenchVersion } from './blockbenchVersionManager'
import { exists, readdirSafe } from './fileUtil'
import { log } from './util'

const ENVIRONMENT_FILE_NAME = '.envbench.json'

interface EnvironmentFile {
	name: string
	envbench_version: string
	blockbench_version: NamedBlockbenchVersion
	launchArgs?: string[]
}

export class EnvironmentError extends Error {
	constructor(message: string) {
		super(message)
		this.name = 'EnvironmentError'
	}
}

export async function assertStorageFolder() {
	if (!(await exists(process.env.ENVBENCH_STORAGE_FOLDER))) {
		await mkdir(process.env.ENVBENCH_STORAGE_FOLDER, { recursive: true }).catch(err => {
			$.red(err)
			process.exit(1)
		})
	}
}

export async function environmentExists(
	name: string,
	showWarning = false
): Promise<'env' | 'folder' | false> {
	const folderExists = await exists(join(process.env.ENVBENCH_STORAGE_FOLDER, name))
	if (!folderExists) {
		if (showWarning) {
			log().yellow('Environment "', name, '" does not exist!\n')
		}
		return false
	}
	const environmentFileExists = await exists(
		join(process.env.ENVBENCH_STORAGE_FOLDER, name, ENVIRONMENT_FILE_NAME)
	)
	if (folderExists && !environmentFileExists) {
		if (showWarning) {
			log().yellow('Environment "', name, '" is missing an environment file!\n')
		}
		return 'folder'
	} else if (!environmentFileExists) {
		if (showWarning) {
			log().yellow('Environment "', name, '" does not exist!\n')
		}
		return false
	}
	return 'env'
}

export async function setEnvironmentFile(name: string, data: EnvironmentFile, force = false) {
	const path = join(process.env.ENVBENCH_STORAGE_FOLDER, name)
	if (!force && !(await environmentExists(name, true))) {
		throw new EnvironmentError(`Environment ${name} does not exist!`)
	}
	return await writeFile(
		join(path, ENVIRONMENT_FILE_NAME),
		JSON.stringify(data, null, '\t')
	).catch(err => {
		log().red(`Failed to write environment file:\n`)
		log().error(err)
		process.exit(1)
	})
}

export async function getEnvironmentFile(name: string): Promise<EnvironmentFile> {
	const path = join(process.env.ENVBENCH_STORAGE_FOLDER, name)
	if (!(await environmentExists(name, true))) {
		throw new EnvironmentError(`Environment ${name} does not exist!`)
	}
	return await readFile(join(path, ENVIRONMENT_FILE_NAME), 'utf-8')
		.then(content => {
			const json = JSON.parse(content) as EnvironmentFile
			// Validate the environment file
			if (!json.name) {
				throw new EnvironmentError('Environment file is missing a name!')
			}
			json.envbench_version ??= version
			json.blockbench_version ??= 'latest'
			if (typeof json.blockbench_version !== 'string') {
				throw new EnvironmentError('Blockbench version must be a string!')
			}
			if (json.launchArgs != undefined) {
				if (
					!Array.isArray(json.launchArgs) ||
					!json.launchArgs.every(arg => typeof arg === 'string')
				) {
					throw new EnvironmentError(
						`Launch arguments must be an array of strings (or undefined), found '${typeof json.launchArgs}'`
					)
				}
			}
			return json
		})
		.catch(err => {
			log().red(`Failed to read environment file:\n`)
			log().error(err, '\n\n')
			process.exit(1)
		})
}

export async function getEnvironmentStates() {
	const folders = await readdirSafe(process.env.ENVBENCH_STORAGE_FOLDER)
	if (!folders) {
		return {}
	}

	const environmentNames: Record<string, EnvironmentFile | 'folder' | false> = {}
	for (const name of folders) {
		if (!name || name.startsWith('.')) {
			continue
		}
		const result = await environmentExists(name)
		if (result === 'env') {
			environmentNames[name] = await getEnvironmentFile(name)
			// .catch(error => {
			// 	log().yellow('Failed to read environment file for ', name, '\n').error(error)
			// 	return 'folder'
			// })
		} else {
			environmentNames[name] = result
		}
	}
	return environmentNames
}

export async function getEnvironmentFiles() {
	const names = await getEnvironmentStates()
	if (!names) {
		return {}
	}
	const res: Record<string, EnvironmentFile | undefined> = {}
	for (const [name, status] of Object.entries(names)) {
		if (status === 'folder') {
			continue
		}
		res[name] = await getEnvironmentFile(name).catch(() => undefined)
	}
	return res
}

export async function removeEnvironment(name: string) {
	if (!(await environmentExists(name, true))) {
		throw new EnvironmentError(`Environment ${name} does not exist!`)
	}
	const path = join(process.env.ENVBENCH_STORAGE_FOLDER, name)
	await rm(path, { recursive: true }).catch(err => {
		log().red(`Failed to remove environment:\n`)
		log().error(err)
		process.exit(1)
	})
}

export function validateEnvironmentName(name: string) {
	if (name.startsWith('.')) {
		log().red('Environment names cannot start with a period!\n')
		process.exit(1)
	}
}

export function validateBlockbenchLaunchArgs(args: string[]) {
	if (args.includes('--userData')) {
		log().red(
			'You cannot use the --userData flag with Envbench, as it would break the isolation of the Blockbench instance.\n'
		)
		process.exit(1)
	}
}
