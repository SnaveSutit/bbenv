import { getDefaultPortablesCache, getDefaultStorageDir } from './paths'

/**
 * Options for constructing an {@link "./envbench".Envbench} instance.
 */
export interface EnvbenchOptions {
	/** Folder environments are stored in. Defaults to `~/.envbench`. */
	storageDir?: string
	/**
	 * Folder downloaded Blockbench portables are cached in. Defaults to
	 * `<storageDir>/.portables`.
	 */
	portablesCache?: string
	/**
	 * Force EnvBench's online state instead of probing for it. Set to `false` to
	 * work fully offline, or `true` to skip the network probe when you know you
	 * are online.
	 */
	online?: boolean
}

/**
 * Fills in the default paths for any options that were left out.
 */
export function resolvePaths(options: EnvbenchOptions = {}): {
	storageDir: string
	portablesCache: string
} {
	const storageDir = options.storageDir ?? getDefaultStorageDir()
	const portablesCache = options.portablesCache ?? getDefaultPortablesCache(storageDir)
	return { storageDir, portablesCache }
}

/**
 * Probes for network access by hitting the GitHub API.
 */
export async function probeOnline(): Promise<boolean> {
	return await fetch('https://api.github.com')
		.then(() => true)
		.catch(() => false)
}
