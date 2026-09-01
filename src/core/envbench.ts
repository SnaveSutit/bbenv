import type { ChildProcess } from 'node:child_process'
import {
	type DownloadHooks,
	getInstalledVersions,
	installVersion,
	isValidBlockbenchVersion,
	launchBlockbench,
	pruneBlockbenchVersions,
	resolveVersion,
} from './blockbench'
import { type EnvbenchOptions, probeOnline, resolvePaths } from './context'
import {
	assertStorageFolder,
	environmentExists,
	getEnvironmentFile,
	getEnvironmentStates,
	removeEnvironment,
	renameEnvironment,
	setEnvironmentFile,
	validateEnvironmentName,
	writeNewEnvironment,
} from './environments'
import { BlockbenchVersionError, EnvironmentError } from './errors'
import { validateBlockbenchLaunchArgs } from './launchArgs'
import type {
	EnvironmentFile,
	EnvironmentState,
	NamedBlockbenchVersion,
	ResolvedBlockbenchVersion,
} from './types'
import { ENVBENCH_VERSION } from './version'

export type { DownloadHooks } from './blockbench'

/** Options for {@link Envbench.createEnvironment}. */
export interface CreateEnvironmentOptions {
	blockbenchVersion?: NamedBlockbenchVersion
	launchArgs?: string[]
	/** Overwrite an existing environment of the same name. */
	force?: boolean
}

/** Changes {@link Envbench.modifyEnvironment} can apply. */
export interface ModifyEnvironmentOptions {
	blockbenchVersion?: NamedBlockbenchVersion
	launchArgs?: string[]
	rename?: string
}

/**
 * Manages Blockbench environments in a storage folder. Every method returns a
 * value or throws an {@link "./errors".EnvbenchError} subclass - nothing is
 * printed and the process is never exited.
 */
export class Envbench {
	/** The running EnvBench version. */
	static readonly version = ENVBENCH_VERSION

	/** Folder environments are stored in. */
	readonly storageDir: string
	/** Folder downloaded Blockbench portables are cached in. */
	readonly portablesCache: string

	#online: boolean | undefined
	#onlineProbe: Promise<boolean> | undefined

	constructor(options: EnvbenchOptions = {}) {
		const { storageDir, portablesCache } = resolvePaths(options)
		this.storageDir = storageDir
		this.portablesCache = portablesCache
		this.#online = options.online
	}

	/**
	 * Whether EnvBench has network access. Probes once and caches the result,
	 * unless `online` was passed to the constructor.
	 */
	async isOnline(): Promise<boolean> {
		if (this.#online !== undefined) {
			return this.#online
		}
		this.#onlineProbe ??= probeOnline()
		return await this.#onlineProbe
	}

	/** Creates the storage folder if it does not exist yet. */
	async ensureStorageFolder(): Promise<void> {
		await assertStorageFolder(this.storageDir)
	}

	// --- Environments -------------------------------------------------------

	/** The state of every directory in the storage folder, keyed by name. */
	async listEnvironments(): Promise<Record<string, EnvironmentState>> {
		return await getEnvironmentStates(this.storageDir)
	}

	/** Whether an environment exists (`'env'`), is missing its file (`'folder'`), or is absent (`false`). */
	async environmentExists(name: string): Promise<'env' | 'folder' | false> {
		return await environmentExists(this.storageDir, name)
	}

	/** Reads and validates an environment's `.envbench.json` file. */
	async getEnvironment(name: string): Promise<EnvironmentFile> {
		return await getEnvironmentFile(this.storageDir, name)
	}

	/** Creates a new environment, installing its Blockbench version first. */
	async createEnvironment(
		name: string,
		options: CreateEnvironmentOptions = {},
		hooks: DownloadHooks = {}
	): Promise<void> {
		validateEnvironmentName(name)
		const version = options.blockbenchVersion ?? 'latest'
		const launchArgs = options.launchArgs ?? []
		validateBlockbenchLaunchArgs(launchArgs)

		if ((await environmentExists(this.storageDir, name)) !== false && !options.force) {
			throw new EnvironmentError(`Environment ${name} already exists!`)
		}

		const online = await this.isOnline()
		if (!(await isValidBlockbenchVersion(online, version))) {
			throw new BlockbenchVersionError(`Invalid Blockbench version '${version}'!`)
		}
		await installVersion(this.portablesCache, online, version, hooks)

		await writeNewEnvironment(this.storageDir, {
			name,
			envbench_version: ENVBENCH_VERSION,
			blockbench_version: version,
			launchArgs,
		})
	}

	/** Applies launch-argument, version, and/or rename changes to an environment. */
	async modifyEnvironment(name: string, changes: ModifyEnvironmentOptions): Promise<void> {
		if ((await environmentExists(this.storageDir, name)) === false) {
			throw new EnvironmentError(`Environment ${name} does not exist!`)
		}
		const envFile = await getEnvironmentFile(this.storageDir, name)

		if (changes.launchArgs !== undefined) {
			validateBlockbenchLaunchArgs(changes.launchArgs)
			envFile.launchArgs = changes.launchArgs
		}
		if (changes.blockbenchVersion !== undefined) {
			envFile.blockbench_version = changes.blockbenchVersion
		}
		await setEnvironmentFile(this.storageDir, name, envFile)

		if (changes.rename !== undefined) {
			await renameEnvironment(this.storageDir, name, changes.rename)
		}
	}

	/** Renames an environment's folder and rewrites its `name` field. */
	async renameEnvironment(name: string, newName: string): Promise<void> {
		await renameEnvironment(this.storageDir, name, newName)
	}

	/** Deletes an environment folder and everything in it. */
	async deleteEnvironment(name: string): Promise<void> {
		await removeEnvironment(this.storageDir, name)
	}

	// --- Launching ---------------------------------------------------------

	/**
	 * Launches Blockbench for an existing environment. Returns the spawned
	 * process (stdout/stderr are piped); the caller owns its output and lifetime.
	 */
	async launch(
		name: string,
		options: { extraArgs?: string[] } = {},
		hooks: DownloadHooks = {}
	): Promise<ChildProcess> {
		if ((await environmentExists(this.storageDir, name)) === false) {
			throw new EnvironmentError(`Environment ${name} does not exist!`)
		}
		const envFile = await getEnvironmentFile(this.storageDir, name)
		const args = [...(envFile.launchArgs ?? []), ...(options.extraArgs ?? [])]
		validateBlockbenchLaunchArgs(args)

		return await launchBlockbench(
			{
				storageDir: this.storageDir,
				portablesCache: this.portablesCache,
				online: await this.isOnline(),
			},
			envFile.blockbench_version,
			name,
			args,
			hooks
		)
	}

	/**
	 * Creates (or reuses) a hidden temporary environment for a Blockbench
	 * version and launches it.
	 */
	async quicklaunch(
		version: NamedBlockbenchVersion,
		options: { extraArgs?: string[]; reset?: boolean } = {},
		hooks: DownloadHooks = {}
	): Promise<ChildProcess> {
		const online = await this.isOnline()
		if (!(await isValidBlockbenchVersion(online, version))) {
			throw new BlockbenchVersionError(`Invalid Blockbench version '${version}'!`)
		}
		await installVersion(this.portablesCache, online, version, hooks)

		// Use the name the caller gave, not the resolved version, so a
		// `latest` environment does not change when a new version releases.
		const name = `.quicklaunch-${version}`

		if ((await environmentExists(this.storageDir, name)) !== false && options.reset) {
			await removeEnvironment(this.storageDir, name).catch(err => {
				if (!(err instanceof EnvironmentError)) {
					throw err
				}
			})
		}
		if ((await environmentExists(this.storageDir, name)) === false) {
			await writeNewEnvironment(this.storageDir, {
				name,
				envbench_version: ENVBENCH_VERSION,
				blockbench_version: version,
			})
		}

		return await this.launch(name, { extraArgs: options.extraArgs }, hooks)
	}

	// --- Blockbench versions ---------------------------------------------

	/** Resolves `'latest'` / `'beta'` / a `vX.Y.Z` tag to a bare `X.Y.Z` version. */
	async resolveVersion(version: NamedBlockbenchVersion): Promise<ResolvedBlockbenchVersion> {
		return await resolveVersion(await this.isOnline(), version)
	}

	/** Checks that a Blockbench version exists and is new enough for EnvBench. */
	async isValidBlockbenchVersion(version: NamedBlockbenchVersion): Promise<boolean> {
		return await isValidBlockbenchVersion(await this.isOnline(), version)
	}

	/** Ensures a Blockbench version is installed, downloading it if necessary. */
	async installVersion(
		version: NamedBlockbenchVersion,
		hooks: DownloadHooks = {}
	): Promise<void> {
		await installVersion(this.portablesCache, await this.isOnline(), version, hooks)
	}

	/** The resolved versions of every portable in the cache. */
	async listInstalledVersions(): Promise<ResolvedBlockbenchVersion[]> {
		return await getInstalledVersions(this.portablesCache)
	}

	/**
	 * Removes every cached portable not referenced by an existing environment.
	 * Returns the versions that were removed.
	 */
	async pruneVersions(): Promise<ResolvedBlockbenchVersion[]> {
		return await pruneBlockbenchVersions(
			this.storageDir,
			this.portablesCache,
			await this.isOnline()
		)
	}
}
