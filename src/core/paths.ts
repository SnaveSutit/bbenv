import { homedir } from 'os'
import { join, normalize } from 'path'

/**
 * The default folder EnvBench stores environments in: `~/.envbench`.
 */
export function getDefaultStorageDir() {
	// REVIEW: Not sure if this will work on Darwin.
	return normalize(join(homedir(), '.envbench'))
}

/**
 * The default folder downloaded Blockbench portables are cached in.
 * @param storageDir The storage folder to place the cache inside. Defaults to
 * {@link getDefaultStorageDir}.
 */
export function getDefaultPortablesCache(storageDir = getDefaultStorageDir()) {
	return join(storageDir, '.portables')
}

/**
 * The path to EnvBench's settings file.
 * @param storageDir The storage folder the settings file lives in. Defaults to
 * {@link getDefaultStorageDir}.
 */
export function getSettingsFilePath(storageDir = getDefaultStorageDir()) {
	return normalize(join(storageDir, '.settings.json'))
}
