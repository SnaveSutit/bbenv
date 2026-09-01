import { compare } from 'compare-versions'
import { type ChildProcess, spawn } from 'node:child_process'
import { createHash } from 'node:crypto'
import { createWriteStream } from 'node:fs'
import { chmod, mkdir, readdir, readFile, unlink } from 'node:fs/promises'
import { platform } from 'node:os'
import { join, parse } from 'node:path'
import { Readable } from 'node:stream'
import type { ReadableStream } from 'node:stream/web'
import { pipeline as streamPipeline } from 'node:stream/promises'
import yaml from 'yaml'
import {
	BlockbenchVersionError,
	DownloadError,
	IntegrityError,
	LaunchError,
	OfflineError,
	UnsupportedPlatformError,
} from './errors'
import { getEnvironmentFiles } from './environments'
import { exists } from './fileUtil'
import { validateBlockbenchLaunchArgs } from './launchArgs'
import type { DownloadProgress, NamedBlockbenchVersion, ResolvedBlockbenchVersion } from './types'

const RELEASES_API_URL = 'http://api.github.com/repos/JannisX11/Blockbench/releases'
const RELEASE_TAGS_URL = RELEASES_API_URL + '/tags'
const LATEST_RELEASE_URL = RELEASES_API_URL + '/latest'
const MINIMUM_BLOCKBENCH_VERSION: ResolvedBlockbenchVersion = '4.10.0'

/** Hooks a caller can pass to observe a portable download. */
export interface DownloadHooks {
	/** Called once, before the download starts. */
	onDownloadStart?: (version: ResolvedBlockbenchVersion) => void
	/** Called repeatedly as bytes arrive. */
	onProgress?: (progress: DownloadProgress) => void
	/** Called once the download has finished and passed its integrity check. */
	onDownloadComplete?: (version: ResolvedBlockbenchVersion) => void
}

/**
 * The standardized cache file name for a Blockbench portable of `version` on the
 * current platform, e.g. `blockbench-5.1.6.AppImage`. This is the name EnvBench
 * downloads a portable to and launches it from; consumers that need to locate
 * the executable themselves should build the path from this rather than
 * hard-coding the convention.
 */
export function getPortableName(version: ResolvedBlockbenchVersion): string {
	switch (platform()) {
		case 'win32':
			return `blockbench-${version}.exe`
		case 'darwin':
			return `blockbench-${version}.dmg`
		case 'linux':
			return `blockbench-${version}.AppImage`
		default:
			throw new UnsupportedPlatformError(platform())
	}
}

/** The GitHub release download URL for a Blockbench portable on the current platform. */
function portableDownloadUrl(version: ResolvedBlockbenchVersion): string {
	const base = `http://github.com/JannisX11/blockbench/releases/download/v${version}`
	switch (platform()) {
		case 'win32':
			return `${base}/Blockbench_${version}_portable.exe`
		case 'darwin':
			return `${base}/Blockbench_${version}.dmg`
		case 'linux':
			return `${base}/Blockbench_${version}.AppImage`
		default:
			throw new UnsupportedPlatformError(platform())
	}
}

/** The version string encoded in a portable's cache file name, or `undefined`. */
export function parsePortableVersion(fileName: string): ResolvedBlockbenchVersion | undefined {
	const match = /^blockbench[-_](\d+\.\d+\.\d+)\.(?:exe|dmg|AppImage)$/i.exec(fileName)
	return match ? (match[1] as ResolvedBlockbenchVersion) : undefined
}

/** The absolute path a portable of `version` is cached at, inside `portablesCache`. */
export function getPortablePath(
	portablesCache: string,
	version: ResolvedBlockbenchVersion
): string {
	return join(portablesCache, getPortableName(version))
}

async function getLinuxManifest(version: ResolvedBlockbenchVersion): Promise<{ sha512: string }> {
	const url = `http://github.com/JannisX11/blockbench/releases/download/v${version}/latest-linux.yml`
	const res = await fetch(url)
	if (!res.ok) {
		throw new IntegrityError(
			`Failed to fetch the Blockbench ${version} checksum manifest: ${res.statusText}`
		)
	}
	return yaml.parse(await res.text())
}

/** Resolves `'latest'` / `'beta'` / a `vX.Y.Z` tag to a bare `X.Y.Z` version. */
export async function resolveVersion(
	online: boolean,
	version: NamedBlockbenchVersion
): Promise<ResolvedBlockbenchVersion> {
	if (version === undefined) {
		throw new BlockbenchVersionError('No Blockbench version specified!')
	}
	if (version === 'latest' || version === 'beta') {
		if (!online) {
			throw new OfflineError(
				`You are offline, so the '${version}' Blockbench version cannot be resolved.`
			)
		}
		version = version === 'latest' ? await getLatestVersion() : await getLatestBetaVersion()
	}
	return (version.startsWith('v') ? version.slice(1) : version) as ResolvedBlockbenchVersion
}

async function getLatestVersion(): Promise<NamedBlockbenchVersion> {
	const res = await fetch(LATEST_RELEASE_URL)
	if (!res.ok) {
		throw new BlockbenchVersionError(
			`Failed to fetch the latest Blockbench release: ${res.statusText}`
		)
	}
	return (await res.json()).tag_name as NamedBlockbenchVersion
}

async function getLatestBetaVersion(): Promise<NamedBlockbenchVersion> {
	const res = await fetch(RELEASES_API_URL)
	if (!res.ok) {
		throw new BlockbenchVersionError(`Failed to fetch Blockbench releases: ${res.statusText}`)
	}
	const betaRelease = (await res.json()).find((release: any) => release.prerelease)
	if (!betaRelease) {
		throw new BlockbenchVersionError('No beta Blockbench release found!')
	}
	return betaRelease.tag_name as NamedBlockbenchVersion
}

/**
 * Checks that a Blockbench version exists and is new enough for EnvBench.
 * Returns `true` without checking when offline.
 */
export async function isValidBlockbenchVersion(
	online: boolean,
	version: NamedBlockbenchVersion
): Promise<boolean> {
	if (!online) {
		return true
	}
	const resolved = await resolveVersion(online, version)
	const prefixedVersion = `v${resolved}`

	if (compare(resolved, MINIMUM_BLOCKBENCH_VERSION, '<')) {
		throw new BlockbenchVersionError(
			`Blockbench ${prefixedVersion} is not supported by EnvBench, as it does not allow changing the userData folder. Please use version v${MINIMUM_BLOCKBENCH_VERSION} or later.`
		)
	}

	const res = await fetch(RELEASE_TAGS_URL + '/' + prefixedVersion)
	if (!res.ok) {
		return false
	}
	return (await res.json()).tag_name === prefixedVersion
}

/**
 * Verifies an installed portable against its published checksum. Only Linux
 * AppImages are checkable; other platforms always pass.
 */
export async function verifyInstalledVersion(
	portablesCache: string,
	version: ResolvedBlockbenchVersion
): Promise<boolean> {
	const blockbenchPath = getPortablePath(portablesCache, version)
	if (!blockbenchPath.endsWith('.AppImage')) {
		return true
	}
	const manifest = await getLinuxManifest(version)
	const hash = createHash('sha512')
		.update(await readFile(blockbenchPath))
		.digest('base64')
	return hash === manifest.sha512
}

/**
 * Downloads a Blockbench portable into the cache. Throws if it is already
 * installed, EnvBench is offline, the download fails, or the file fails its
 * integrity check.
 */
async function downloadPortable(
	portablesCache: string,
	online: boolean,
	version: ResolvedBlockbenchVersion,
	hooks: DownloadHooks = {}
): Promise<string> {
	if (!online) {
		throw new OfflineError('You are offline, so Blockbench cannot be downloaded.')
	}
	const target = getPortablePath(portablesCache, version)
	if (await exists(target)) {
		throw new DownloadError(
			`Attempted to install Blockbench version ${version}, but it is already installed!`
		)
	}
	const url = portableDownloadUrl(version)

	await mkdir(parse(target).dir, { recursive: true })
	hooks.onDownloadStart?.(version)

	try {
		const res = await fetch(url)
		if (!res.ok || !res.body) {
			throw new Error(`server responded ${res.status} ${res.statusText}`)
		}

		const total = Number(res.headers.get('content-length') ?? 0)
		let transferred = 0
		const body = Readable.fromWeb(res.body as ReadableStream<Uint8Array>)
		body.on('data', (chunk: Buffer) => {
			transferred += chunk.length
			hooks.onProgress?.({
				transferred,
				total,
				percent: total > 0 ? transferred / total : 0,
			})
		})

		await streamPipeline(body, createWriteStream(target))
	} catch (err: any) {
		await unlink(target).catch(() => undefined)
		throw new DownloadError(`Failed to download Blockbench ${version}: ${err.message}`)
	}

	if (!(await verifyInstalledVersion(portablesCache, version))) {
		await unlink(target).catch(() => undefined)
		throw new IntegrityError(
			`The downloaded copy of Blockbench ${version} failed its integrity check. Please try installing again.`
		)
	}

	if (platform() === 'linux') {
		await chmod(target, 0o755)
	}
	hooks.onDownloadComplete?.(version)
	return target
}

/**
 * Ensures a Blockbench version is installed, downloading it if necessary.
 * @param ignoreAlreadyInstalled When `false`, throws if the version is already
 * installed.
 */
export async function installVersion(
	portablesCache: string,
	online: boolean,
	version: NamedBlockbenchVersion,
	hooks: DownloadHooks = {},
	ignoreAlreadyInstalled = true
): Promise<void> {
	const resolved = await resolveVersion(online, version)
	if (await exists(getPortablePath(portablesCache, resolved))) {
		if (ignoreAlreadyInstalled) {
			return
		}
		throw new DownloadError(`Blockbench ${resolved} is already installed!`)
	}
	await downloadPortable(portablesCache, online, resolved, hooks)
}

/**
 * Launches Blockbench for an environment, downloading or repairing the portable
 * first if needed. Returns the spawned process; the caller decides what to do
 * with its output and lifetime.
 */
export async function launchBlockbench(
	options: {
		storageDir: string
		portablesCache: string
		online: boolean
	},
	version: NamedBlockbenchVersion,
	environmentName: string,
	args: string[] = [],
	hooks: DownloadHooks = {}
): Promise<ChildProcess> {
	const { storageDir, portablesCache, online } = options
	const resolved = await resolveVersion(online, version)
	const blockbenchPath = getPortablePath(portablesCache, resolved)

	if (!(await exists(blockbenchPath))) {
		await downloadPortable(portablesCache, online, resolved, hooks)
	} else if (!(await verifyInstalledVersion(portablesCache, resolved))) {
		await unlink(blockbenchPath)
		await downloadPortable(portablesCache, online, resolved, hooks)
	}

	validateBlockbenchLaunchArgs(args)
	const userDataFolder = join(storageDir, environmentName)
	const spawnArgs = ['--userData', userDataFolder, ...args]

	try {
		return spawn(blockbenchPath, spawnArgs, { shell: false, stdio: ['ignore', 'pipe', 'pipe'] })
	} catch (err: any) {
		throw new LaunchError(`Failed to launch Blockbench: ${err.message}`)
	}
}

/** The resolved versions of every portable in the cache. */
export async function getInstalledVersions(
	portablesCache: string
): Promise<ResolvedBlockbenchVersion[]> {
	const files = await readdir(portablesCache).catch(() => [] as string[])
	return files
		.map(parsePortableVersion)
		.filter((v): v is ResolvedBlockbenchVersion => v !== undefined)
}

/**
 * Removes every cached portable that is not referenced by an existing
 * environment. Returns the versions that were removed.
 */
export async function pruneBlockbenchVersions(
	storageDir: string,
	portablesCache: string,
	online: boolean
): Promise<ResolvedBlockbenchVersion[]> {
	const environments = await getEnvironmentFiles(storageDir)
	const versionsInUse = new Set<ResolvedBlockbenchVersion>()
	for (const envFile of Object.values(environments)) {
		versionsInUse.add(await resolveVersion(online, envFile.blockbench_version))
	}

	const removed: ResolvedBlockbenchVersion[] = []
	for (const version of await getInstalledVersions(portablesCache)) {
		if (!versionsInUse.has(version)) {
			await unlink(getPortablePath(portablesCache, version))
			removed.push(version)
		}
	}
	return removed
}
