import type { BunPlugin } from 'bun'
import * as fs from 'fs'
import * as pathjs from 'path'

interface IRecursiveDirEntry {
	// The file's name with extension
	name: string
	// The file's extension
	ext: string
	// The file's absolute path
	path: string
	// The parent directory's absolute path
	parentPath: string
	// The file's path relative to the directory being recursed
	localPath: string
}

interface IRecursiveReadDirSyncOptions {
	encoding?: BufferEncoding
	maxDepth?: number
	filter?: (file: IRecursiveDirEntry) => boolean
}

/**
 * Recursively reads a directory and returns an array of file information.
 * @param dir The directory to read.
 * @param encoding The encoding to use when reading file names.
 * @param maxDepth The maximum depth to recurse into subdirectories.
 * @returns An array of file information objects.
 */
function recursiveReadDirSync(
	dir: string,
	{ encoding = 'utf-8', maxDepth = 200, filter }: IRecursiveReadDirSyncOptions
): IRecursiveDirEntry[] {
	const files: IRecursiveDirEntry[] = []

	function recurse(localDir: string, depth = 0) {
		// If a local index is found, it is imported and the rest of the directory is ignored.
		const indexPath = pathjs.join(localDir, 'index.ts')
		if (fs.existsSync(indexPath)) {
			const absolutePath = pathjs.resolve(localDir, 'index.ts')
			files.push({
				name: 'index',
				ext: '.ts',
				path: absolutePath,
				parentPath: localDir,
				localPath: pathjs.relative(dir, absolutePath),
			})
			return
		}

		fs.readdirSync(localDir, { encoding, withFileTypes: true }).forEach(dirEntry => {
			const absolutePath = pathjs.join(localDir, dirEntry.name)
			if (dirEntry.isDirectory() && depth <= maxDepth) {
				recurse(absolutePath, depth + 1)
			} else {
				const fileEntry: IRecursiveDirEntry = {
					name: dirEntry.name,
					ext: pathjs.extname(dirEntry.name),
					path: absolutePath,
					parentPath: pathjs.dirname(absolutePath),
					localPath: pathjs.relative(dir, absolutePath),
				}
				if (!!filter && !filter(fileEntry)) return
				files.push(fileEntry)
			}
		})
	}
	recurse(dir)

	return files
}

function normalizePathToPosix(path: string) {
	return path.replaceAll(pathjs.sep, pathjs.posix.sep)
}

const NAMESPACE = 'import-folder'

/**
 * A plugin for importing all files in a folder without manually updating an index file.
 * To recurse into subdirectories, use the `//` suffix.
 *
 * A single `/` suffix imports only the folder's direct children. If the folder
 * contains an `index.ts`, that file is imported and the rest of the folder is
 * ignored.
 */
const plugin = (): BunPlugin => {
	return {
		name: NAMESPACE,
		setup(build) {
			build.onResolve({ filter: /.+\/\/?$/ }, args => {
				const resolveDir = args.importer ? pathjs.dirname(args.importer) : process.cwd()
				const fullPath = normalizePathToPosix(pathjs.resolve(resolveDir, args.path))

				if (!fs.existsSync(fullPath) || !fs.statSync(fullPath).isDirectory()) {
					throw new Error(
						`"${fullPath}" is not a directory, but is being imported with a "/" suffix (from ${args.importer}).`
					)
				}

				return {
					// The trailing slashes are stripped so the path resolves to a real
					// directory; the recursion depth is encoded in the namespace.
					path: fullPath,
					namespace: args.path.endsWith('//') ? `${NAMESPACE}-recursive` : NAMESPACE,
				}
			})

			for (const namespace of [NAMESPACE, `${NAMESPACE}-recursive`]) {
				const recursive = namespace.endsWith('-recursive')

				build.onLoad({ filter: /.*/, namespace }, args => {
					const filter: IRecursiveReadDirSyncOptions['filter'] = file =>
						file.ext === '.js' || file.ext === '.ts'

					const files = recursiveReadDirSync(args.path, {
						encoding: 'utf-8',
						filter,
						maxDepth: recursive ? undefined : 0,
					})

					// Absolute specifiers so the generated module needs no resolve dir.
					const contents = files
						.map(file => `import '${normalizePathToPosix(file.path)}';`)
						.join('\n')

					console.log(
						`📃 imports folder ${normalizePathToPosix(
							pathjs.relative(process.cwd(), args.path)
						)}${recursive ? ' recursively' : ''}.`
					)

					return { loader: 'js', contents }
				})
			}
		},
	}
}

export default plugin
