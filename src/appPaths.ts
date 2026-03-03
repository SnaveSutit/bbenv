import { homedir } from 'os'
import { join, normalize } from 'path'

export function getDefaultEnvBenchStorageFolder() {
	// REVIEW: Not sure if this will work on Darwin.
	return normalize(join(homedir(), '.envbench'))
}

export function getPortablesCachePath() {
	return join(getDefaultEnvBenchStorageFolder(), '.portables')
}

export function getSettingsFilePath() {
	return normalize(join(getDefaultEnvBenchStorageFolder(), '.settings.json'))
}
