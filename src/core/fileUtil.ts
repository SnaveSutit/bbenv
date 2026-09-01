import { access, readdir } from 'fs/promises'

/**
 * Checks if a file or directory exists.
 */
export async function exists(path: string): Promise<boolean> {
	return await access(path)
		.then(() => true)
		.catch(() => false)
}

/**
 * A wrapper for `fs.readdir` that returns `undefined` if an error occurs.
 */
export async function readdirSafe(path: string): Promise<string[] | undefined> {
	return await readdir(path).catch(() => undefined)
}
