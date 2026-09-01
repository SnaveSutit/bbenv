import { mkdir, readFile, rename as fsRename, rm, writeFile } from 'fs/promises'
import { join } from 'path'
import { EnvironmentError, ValidationError } from './errors'
import { exists, readdirSafe } from './fileUtil'
import type { EnvironmentFile, EnvironmentState } from './types'
import { ENVBENCH_VERSION } from './version'

const ENVIRONMENT_FILE_NAME = '.envbench.json'

/** Creates the storage folder if it does not exist yet. */
export async function assertStorageFolder(storageDir: string): Promise<void> {
	if (!(await exists(storageDir))) {
		await mkdir(storageDir, { recursive: true })
	}
}

/**
 * Reports whether an environment exists:
 * - `'env'` - a folder with a valid `.envbench.json`
 * - `'folder'` - a folder missing its `.envbench.json`
 * - `false` - no folder at all
 */
export async function environmentExists(
	storageDir: string,
	name: string
): Promise<'env' | 'folder' | false> {
	if (!(await exists(join(storageDir, name)))) {
		return false
	}
	const fileExists = await exists(join(storageDir, name, ENVIRONMENT_FILE_NAME))
	return fileExists ? 'env' : 'folder'
}

/** Throws if an environment name is not allowed. */
export function validateEnvironmentName(name: string): void {
	if (name.startsWith('.')) {
		throw new ValidationError('Environment names cannot start with a period!')
	}
}

/**
 * Writes an environment's `.envbench.json` file.
 * @param force Skip the check that the environment folder already exists.
 */
export async function setEnvironmentFile(
	storageDir: string,
	name: string,
	data: EnvironmentFile,
	force = false
): Promise<void> {
	if (!force && (await environmentExists(storageDir, name)) === false) {
		throw new EnvironmentError(`Environment ${name} does not exist!`)
	}
	await writeFile(
		join(storageDir, name, ENVIRONMENT_FILE_NAME),
		JSON.stringify(data, null, '\t')
	)
}

/**
 * Creates a new environment folder and writes its `.envbench.json` file.
 * Overwrites any existing folder of the same name.
 */
export async function writeNewEnvironment(
	storageDir: string,
	data: EnvironmentFile
): Promise<void> {
	const path = join(storageDir, data.name)
	await rm(path, { recursive: true, force: true })
	await mkdir(path, { recursive: true })
	await setEnvironmentFile(storageDir, data.name, data, true)
}

/** Reads and validates an environment's `.envbench.json` file. */
export async function getEnvironmentFile(
	storageDir: string,
	name: string
): Promise<EnvironmentFile> {
	if ((await environmentExists(storageDir, name)) !== 'env') {
		throw new EnvironmentError(`Environment ${name} does not exist!`)
	}

	let content: string
	try {
		content = await readFile(join(storageDir, name, ENVIRONMENT_FILE_NAME), 'utf-8')
	} catch (err: any) {
		throw new EnvironmentError(
			`Failed to read the environment file for ${name}: ${err.message}`
		)
	}

	let json: EnvironmentFile
	try {
		json = JSON.parse(content) as EnvironmentFile
	} catch (err: any) {
		throw new EnvironmentError(
			`The environment file for ${name} is not valid JSON: ${err.message}`
		)
	}

	if (!json.name) {
		throw new EnvironmentError(`The environment file for ${name} is missing a name!`)
	}
	json.envbench_version ??= ENVBENCH_VERSION
	json.blockbench_version ??= 'latest'
	if (typeof json.blockbench_version !== 'string') {
		throw new EnvironmentError('Blockbench version must be a string!')
	}
	if (
		json.launchArgs != undefined &&
		(!Array.isArray(json.launchArgs) ||
			!json.launchArgs.every(arg => typeof arg === 'string'))
	) {
		throw new EnvironmentError(
			`Launch arguments must be an array of strings (or undefined), found '${typeof json.launchArgs}'`
		)
	}
	return json
}

/** The state of every directory in the storage folder, keyed by name. */
export async function getEnvironmentStates(
	storageDir: string
): Promise<Record<string, EnvironmentState>> {
	const folders = await readdirSafe(storageDir)
	if (!folders) {
		return {}
	}

	const states: Record<string, EnvironmentState> = {}
	for (const name of folders) {
		if (!name || name.startsWith('.')) {
			continue
		}
		const result = await environmentExists(storageDir, name)
		states[name] =
			result === 'env' ? await getEnvironmentFile(storageDir, name) : result
	}
	return states
}

/** Every valid environment in the storage folder, keyed by name. */
export async function getEnvironmentFiles(
	storageDir: string
): Promise<Record<string, EnvironmentFile>> {
	const res: Record<string, EnvironmentFile> = {}
	for (const [name, state] of Object.entries(await getEnvironmentStates(storageDir))) {
		if (state === 'folder' || state === false) {
			continue
		}
		res[name] = state
	}
	return res
}

/** Deletes an environment folder and everything in it. */
export async function removeEnvironment(storageDir: string, name: string): Promise<void> {
	if ((await environmentExists(storageDir, name)) === false) {
		throw new EnvironmentError(`Environment ${name} does not exist!`)
	}
	await rm(join(storageDir, name), { recursive: true })
}

/**
 * Renames an environment: moves its folder and rewrites the `name` field in its
 * `.envbench.json`.
 */
export async function renameEnvironment(
	storageDir: string,
	name: string,
	newName: string
): Promise<void> {
	if (name === newName) {
		return
	}
	validateEnvironmentName(newName)
	if ((await environmentExists(storageDir, name)) === false) {
		throw new EnvironmentError(`Environment ${name} does not exist!`)
	}
	if ((await environmentExists(storageDir, newName)) !== false) {
		throw new EnvironmentError(`Environment ${newName} already exists!`)
	}
	await fsRename(join(storageDir, name), join(storageDir, newName))

	const envFile = await getEnvironmentFile(storageDir, newName).catch(() => undefined)
	if (envFile) {
		envFile.name = newName
		await setEnvironmentFile(storageDir, newName, envFile)
	}
}
