import assert from 'node:assert/strict'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { platform, tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, it } from 'node:test'
import {
	getInstalledVersions,
	getPortableName,
	getPortablePath,
	parsePortableVersion,
	pruneBlockbenchVersions,
	resolveVersion,
} from './blockbench'
import { writeNewEnvironment } from './environments'
import { OfflineError } from './errors'
import { exists } from './fileUtil'

describe('resolveVersion', () => {
	it('strips a leading v from an explicit version without hitting the network', async () => {
		assert.equal(await resolveVersion(false, 'v4.10.0'), '4.10.0')
		assert.equal(await resolveVersion(true, '4.10.0'), '4.10.0')
	})

	it('throws OfflineError for latest/beta while offline', async () => {
		await assert.rejects(resolveVersion(false, 'latest'), OfflineError)
		await assert.rejects(resolveVersion(false, 'beta'), OfflineError)
	})
})

describe('getPortableName / getPortablePath', () => {
	const ext = { win32: 'exe', darwin: 'dmg' }[platform() as string] ?? 'AppImage'

	it('names a portable for the current platform', () => {
		assert.equal(getPortableName('5.1.6'), `blockbench-5.1.6.${ext}`)
	})

	it('round-trips through parsePortableVersion', () => {
		assert.equal(parsePortableVersion(getPortableName('4.10.0')), '4.10.0')
	})

	it('joins the name onto the cache directory', () => {
		assert.equal(
			getPortablePath('/tmp/cache', '5.1.6'),
			join('/tmp/cache', `blockbench-5.1.6.${ext}`)
		)
	})
})

describe('parsePortableVersion', () => {
	it('extracts the version from a portable file name', () => {
		assert.equal(parsePortableVersion('blockbench-4.10.0.AppImage'), '4.10.0')
		assert.equal(parsePortableVersion('blockbench_4.9.0.exe'), '4.9.0')
		assert.equal(parsePortableVersion('Blockbench-4.11.2.dmg'), '4.11.2')
	})
	it('returns undefined for anything else', () => {
		assert.equal(parsePortableVersion('notes.txt'), undefined)
		assert.equal(parsePortableVersion('blockbench-nightly.AppImage'), undefined)
	})
})

describe('cache operations', () => {
	let storageDir: string
	let portablesCache: string

	beforeEach(async () => {
		storageDir = await mkdtemp(join(tmpdir(), 'envbench-test-'))
		portablesCache = await mkdtemp(join(tmpdir(), 'envbench-cache-'))
	})
	afterEach(async () => {
		await rm(storageDir, { recursive: true, force: true })
		await rm(portablesCache, { recursive: true, force: true })
	})

	it('lists installed versions from the cache', async () => {
		await writeFile(join(portablesCache, 'blockbench-4.10.0.AppImage'), '')
		await writeFile(join(portablesCache, 'blockbench-4.9.0.AppImage'), '')
		await writeFile(join(portablesCache, 'unrelated.file'), '')

		const versions = await getInstalledVersions(portablesCache)
		assert.deepEqual(versions.sort(), ['4.10.0', '4.9.0'])
	})

	it('prunes only versions no environment uses', async () => {
		await writeNewEnvironment(storageDir, {
			name: 'work',
			envbench_version: '9.9.9',
			blockbench_version: 'v4.10.0',
		})
		const used = join(portablesCache, 'blockbench-4.10.0.AppImage')
		const unused = join(portablesCache, 'blockbench-4.9.0.AppImage')
		await writeFile(used, '')
		await writeFile(unused, '')

		const removed = await pruneBlockbenchVersions(storageDir, portablesCache, false)
		assert.deepEqual(removed, ['4.9.0'])
		assert.equal(await exists(used), true)
		assert.equal(await exists(unused), false)
	})
})
