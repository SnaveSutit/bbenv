import { getDefaultEnvBenchStorageFolder, getPortablesCachePath } from './appPaths'

declare global {
	namespace NodeJS {
		// eslint-disable-next-line @typescript-eslint/naming-convention
		export interface ProcessEnv {
			ENVBENCH_STORAGE_FOLDER: string
			BLOCKBENCH_PORTABLES_CACHE: string
		}
	}
}

process.env.ENVBENCH_STORAGE_FOLDER ??= getDefaultEnvBenchStorageFolder()
process.env.BLOCKBENCH_PORTABLES_CACHE ??= getPortablesCachePath()
