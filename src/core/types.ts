export type NamedBlockbenchVersion = 'latest' | 'beta' | `${'v' | ''}${number}.${number}.${number}`
export type ResolvedBlockbenchVersion = `${number}.${number}.${number}`

/**
 * The contents of an environment's `.envbench.json` file.
 */
export interface EnvironmentFile {
	name: string
	envbench_version: string
	blockbench_version: NamedBlockbenchVersion
	launchArgs?: string[]
}

/**
 * The state of a directory inside the storage folder:
 * - an {@link EnvironmentFile} - a valid environment
 * - `'folder'` - a directory that is missing its `.envbench.json` file
 * - `false` - the environment does not exist
 */
export type EnvironmentState = EnvironmentFile | 'folder' | false

/**
 * Progress of a Blockbench portable download.
 */
export interface DownloadProgress {
	/** Bytes downloaded so far. */
	transferred: number
	/** Total bytes to download, or `0` if unknown. */
	total: number
	/** Fraction downloaded, `0`-`1`. */
	percent: number
}
