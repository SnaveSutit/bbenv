/**
 * EnvBench's public library API.
 *
 * ```ts
 * import { Envbench } from 'envbench'
 *
 * const eb = new Envbench({ storageDir: '/path/to/envs' })
 * await eb.createEnvironment('work', { blockbenchVersion: 'latest' })
 * const child = await eb.launch('work')
 * ```
 *
 * The CLI lives at the `envbench` binary (or `envbench/cli`).
 */
export { Envbench } from './core/envbench'
export type {
	CreateEnvironmentOptions,
	DownloadHooks,
	ModifyEnvironmentOptions,
} from './core/envbench'
export { ENVBENCH_VERSION } from './core/version'
export type { EnvbenchOptions } from './core/context'
export {
	getDefaultPortablesCache,
	getDefaultStorageDir,
	getSettingsFilePath,
} from './core/paths'
export { parseBlockbenchLaunchArgs, validateBlockbenchLaunchArgs } from './core/launchArgs'
export * from './core/errors'
export type {
	DownloadProgress,
	EnvironmentFile,
	EnvironmentState,
	NamedBlockbenchVersion,
	ResolvedBlockbenchVersion,
} from './core/types'
