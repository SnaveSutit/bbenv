import { compare } from 'compare-versions'
import { createHash } from 'crypto'
import got from 'got'
import { spawn } from 'node:child_process'
import { createWriteStream } from 'node:fs'
import { chmod, mkdir, readdir, readFile, unlink } from 'node:fs/promises'
import { join, parse } from 'node:path'
import { pipeline as streamPipeline } from 'node:stream/promises'
import { platform } from 'os'
import { terminal as $ } from 'terminal-kit'
import yaml from 'yaml'
import { getEnvironmentFiles, validateBlockbenchLaunchArgs } from './environmentHandler'
import { exists } from './fileUtil'
import { formatBytes, isOnline, log } from './util'

const RELEASES_API_URL = 'http://api.github.com/repos/JannisX11/Blockbench/releases'
const RELEASE_TAGS_URL = RELEASES_API_URL + '/tags'
const LATEST_RELEASE_URL = RELEASES_API_URL + '/latest'
const MINIMUM_BLOCKBENCH_VERSION: ResolvedBlockbenchVersion = '4.10.0'

export type NamedBlockbenchVersion = 'latest' | 'beta' | `${'v' | ''}${number}.${number}.${number}`
export type ResolvedBlockbenchVersion = `${number}.${number}.${number}`

function getNameProvider() {
	switch (platform()) {
		case 'win32':
			return (version: ResolvedBlockbenchVersion) => [
				`http://github.com/JannisX11/blockbench/releases/download/v${version}/Blockbench_${version}_portable.exe`,
				`blockbench-${version}.exe`,
			]
		case 'darwin':
			return (version: ResolvedBlockbenchVersion) => [
				`http://github.com/JannisX11/blockbench/releases/download/v${version}/Blockbench_${version}.dmg`,
				`blockbench-${version}.dmg`,
			]
		case 'linux':
			return (version: ResolvedBlockbenchVersion) => [
				`http://github.com/JannisX11/blockbench/releases/download/v${version}/Blockbench_${version}.AppImage`,
				`blockbench-${version}.AppImage`,
			]
		default:
			$.red(`Unsupported platform: ${platform()}\n`)
			process.exit(1)
	}
}
const urlProvider = getNameProvider()

async function getLinuxManifest(version: ResolvedBlockbenchVersion) {
	const url = `http://github.com/JannisX11/blockbench/releases/download/v${version}/latest-linux.yml`
	const yml = (await got(url)).body
	return yaml.parse(yml)
}

export async function resolveVersion(version: NamedBlockbenchVersion) {
	if (version === undefined) {
		throw new Error('No version specified!')
	} else if (version === 'latest') {
		version = await getLatestBlockbenchVersion()
	} else if (version === 'beta') {
		version = await getLatestBetaBlockbenchVersion()
	}
	return (version.startsWith('v') ? version.slice(1) : version) as ResolvedBlockbenchVersion
}

/**
 * Downloads the Blockbench version specified to the target directory
 * @param target The directory to download the file into
 * @param version The version of Blockbench to download
 * @param fileName The name of the file to save as. Supports {version} as a placeholder for the version
 * @returns The path to the downloaded file
 */
async function downloadNewPortableBlockbench(version: ResolvedBlockbenchVersion) {
	if (!isOnline()) {
		throw new Error('You are offline, so we cannot download Blockbench!\n')
	}

	if (await isVersionInstalled(version)) {
		throw new Error(
			`Attemped to install Blockbench version ${version}, but it is already installed!`
		)
	}
	const target = getPortablePath(version)
	const [url] = urlProvider(version)

	// Progress bar prefix
	$.gray('[').blue('EnvBench').gray('] ').cyan(`Downloading Blockbench ${version}... \n`)

	const progressBar = $.progressBar({
		title: `0000.00MB / 0000.00MB`,
		titleStyle: $.cyan,
		barBracketStyle: $.gray,
		barChar: '#',
		barHeadChar: '#',
		barStyle: $.green,
		minRefreshTime: 250,
	})

	await mkdir(parse(target).dir, { recursive: true })

	try {
		await streamPipeline(
			got.stream(url).on('downloadProgress', progress => {
				progressBar.update({
					progress: progress.percent,
					title: `${formatBytes(progress.transferred)} / ${formatBytes(progress.total ?? 0)}`,
				})
			}),
			createWriteStream(target)
		)
	} catch (err: any) {
		log().red(`Failed to download Blockbench ${version}:\n`, err.message, '\n')
		process.exit(1)
	}

	progressBar.stop()
	$('\n')

	if (!(await verifyInstalledVersion(version))) {
		log().red(
			`The downloaded version of Blockbench ${version} appears to be corrupted (failed integrity check). Please try installing again.\n`
		)
		await unlink(target)
		process.exit(1)
	}

	if (platform() === 'linux') {
		await chmod(target, 0o755) // Make the file executable
	}

	log().green('Blockbench downloaded successfully.\n')

	return target
}

function getPortablePath(version: ResolvedBlockbenchVersion) {
	return join(process.env.BLOCKBENCH_PORTABLES_CACHE, urlProvider(version)[1])
}

export async function isValidBlockbenchVersion(version: NamedBlockbenchVersion) {
	if (!isOnline()) {
		log().yellow(
			'You are offline, so we cannot validate the version of Blockbench this Environment uses.\n'
		)
		return true
	}
	version = await resolveVersion(version)
	const prefixedVersion = `v${version}`

	if (compare(version, MINIMUM_BLOCKBENCH_VERSION, '<')) {
		log().red(
			`Blockbench ${prefixedVersion} is not supported by envbench, as it does not allow changing the userData folder. Please use version v${MINIMUM_BLOCKBENCH_VERSION} or later.\n`
		)
		return false
	}

	const res = await fetch(RELEASE_TAGS_URL + '/' + prefixedVersion)
	if (!res.ok) {
		return false
	}
	const json = await res.json()

	return json.tag_name === prefixedVersion
}

async function getLatestBlockbenchVersion() {
	const res = await fetch(LATEST_RELEASE_URL)
	if (!res.ok) throw new Error(`Failed to fetch latest Blockbench release: ${res.statusText}`)
	const json = await res.json()
	return json.tag_name as NamedBlockbenchVersion
}

async function getLatestBetaBlockbenchVersion() {
	const res = await fetch(RELEASES_API_URL)
	if (!res.ok) throw new Error(`Failed to fetch Blockbench releases: ${res.statusText}`)
	const json = await res.json()
	const betaRelease = json.find((release: any) => release.prerelease)
	if (!betaRelease) throw new Error('No beta release found!')
	return betaRelease.tag_name as NamedBlockbenchVersion
}

async function isVersionInstalled(version: NamedBlockbenchVersion) {
	version = await resolveVersion(version)
	const path = getPortablePath(version)
	const portableInstalled = await exists(path)
	if (portableInstalled) return true
	return false
}

async function verifyInstalledVersion(version: NamedBlockbenchVersion) {
	version = await resolveVersion(version)

	const blockbenchPath = getPortablePath(version)

	if (!blockbenchPath.endsWith('.AppImage')) {
		return true
	}

	const manifest = await getLinuxManifest(version)

	const hash = createHash('sha512')
		.update(await readFile(blockbenchPath))
		.digest('base64')

	if (hash !== manifest.sha512) {
		log()
			.red(
				`Blockbench ${version} failed integrity check! The file may be corrupted.\n  Expected: `
			)
			.green(manifest.sha512)
			.red(`\n  Actual:   `)
			.yellow(hash)(`\n`)
		return false
	}

	return true
}

export async function installVersion(
	version: NamedBlockbenchVersion,
	ignoreAlreadyInstalledError = true
) {
	version = await resolveVersion(version)
	if (await isVersionInstalled(version)) {
		if (ignoreAlreadyInstalledError) {
			return
		} else {
			throw new Error(`Blockbench ${version} is already installed!`)
		}
	}
	await downloadNewPortableBlockbench(version)
}

export async function launchBlockbench(
	version: NamedBlockbenchVersion,
	environmentName: string,
	args: string[] = []
) {
	const resolvedVersion = await resolveVersion(version)

	const blockbenchPath = getPortablePath(resolvedVersion)

	if (!(await isVersionInstalled(version))) {
		await downloadNewPortableBlockbench(resolvedVersion)
	}

	if (!(await verifyInstalledVersion(version))) {
		log().red(
			`The installed version of Blockbench ${version} appears to be corrupted (failed integrity check). Reinstalling...\n`
		)
		await unlink(blockbenchPath)
		await downloadNewPortableBlockbench(resolvedVersion)
	}

	validateBlockbenchLaunchArgs(args)
	const userDataFolder = join(process.env.ENVBENCH_STORAGE_FOLDER, environmentName)
	args = ['--userData', userDataFolder, ...args]

	return new Promise<void>((resolve, reject) => {
		const bb = spawn(blockbenchPath, args, { shell: false })
			.on('error', err => {
				log().red('Failed to launch Blockbench:\n', err.message, '\n')
				process.exit(1)
			})
			.on('spawn', () => {
				log().green('Blockbench launched successfully.\n')
			})
			.on('exit', code => {
				if (code === 0) {
					resolve()
				} else {
					reject(new Error('Blockbench exited with code: ' + code))
				}
			})
			.on('close', () => {
				log().green('Blockbench closed.\n')
				resolve()
			})
		bb.stdout.on('data', data => {
			$(data)
		})
	})
}

export async function getInstalledVersions() {
	const portableFiles = await readdir(process.env.BLOCKBENCH_PORTABLES_CACHE)
	return portableFiles.map(file =>
		file.replace(/^blockbench-|\.exe|\.dmg|\.AppImage$/g, '')
	) as ResolvedBlockbenchVersion[]
}

export async function pruneBlockbenchVersions() {
	const environments = await getEnvironmentFiles()
	const installedVersions = await getInstalledVersions()
	const versionsInUse = new Set<ResolvedBlockbenchVersion>()
	for (const envFile of Object.values(environments)) {
		if (envFile === undefined) continue
		versionsInUse.add(await resolveVersion(envFile.blockbench_version))
	}

	for (const version of installedVersions) {
		if (!versionsInUse.has(version)) {
			log().red(`Removing Blockbench version `).cyan(version).red(`...\n`)
			await unlink(getPortablePath(version))
		}
	}
}
