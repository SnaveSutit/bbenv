import assert from 'node:assert/strict'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, it } from 'node:test'
import {
	environmentExists,
	getEnvironmentFile,
	getEnvironmentStates,
	removeEnvironment,
	renameEnvironment,
	validateEnvironmentName,
	writeNewEnvironment,
} from './environments'
import { EnvironmentError, ValidationError } from './errors'
import type { EnvironmentFile } from './types'

let storageDir: string

beforeEach(async () => {
	storageDir = await mkdtemp(join(tmpdir(), 'envbench-test-'))
})

afterEach(async () => {
	await rm(storageDir, { recursive: true, force: true })
})

const sampleEnv = (name: string): EnvironmentFile => ({
	name,
	envbench_version: '9.9.9',
	blockbench_version: 'v4.10.0',
	launchArgs: ['--foo'],
})

describe('validateEnvironmentName', () => {
	it('rejects names starting with a period', () => {
		assert.throws(() => validateEnvironmentName('.hidden'), ValidationError)
	})
	it('accepts ordinary names', () => {
		assert.doesNotThrow(() => validateEnvironmentName('work'))
	})
})

describe('environment round-trip', () => {
	it('creates, reads, renames, and deletes an environment', async () => {
		assert.equal(await environmentExists(storageDir, 'work'), false)

		await writeNewEnvironment(storageDir, sampleEnv('work'))
		assert.equal(await environmentExists(storageDir, 'work'), 'env')

		const file = await getEnvironmentFile(storageDir, 'work')
		assert.equal(file.name, 'work')
		assert.equal(file.blockbench_version, 'v4.10.0')
		assert.deepEqual(file.launchArgs, ['--foo'])

		await renameEnvironment(storageDir, 'work', 'play')
		assert.equal(await environmentExists(storageDir, 'work'), false)
		assert.equal(await environmentExists(storageDir, 'play'), 'env')
		assert.equal((await getEnvironmentFile(storageDir, 'play')).name, 'play')

		await removeEnvironment(storageDir, 'play')
		assert.equal(await environmentExists(storageDir, 'play'), false)
	})
})

describe('getEnvironmentFile', () => {
	it('throws when the environment does not exist', async () => {
		await assert.rejects(getEnvironmentFile(storageDir, 'nope'), EnvironmentError)
	})

	it('throws on malformed JSON', async () => {
		await mkdir(join(storageDir, 'broken'))
		await writeFile(join(storageDir, 'broken', '.envbench.json'), '{ not json')
		await assert.rejects(getEnvironmentFile(storageDir, 'broken'), EnvironmentError)
	})

	it('throws when the file is missing a name', async () => {
		await mkdir(join(storageDir, 'noname'))
		await writeFile(join(storageDir, 'noname', '.envbench.json'), '{"blockbench_version":"v4.10.0"}')
		await assert.rejects(getEnvironmentFile(storageDir, 'noname'), EnvironmentError)
	})
})

describe('getEnvironmentStates', () => {
	it('reports folders without an environment file', async () => {
		await mkdir(join(storageDir, 'justafolder'))
		await writeNewEnvironment(storageDir, sampleEnv('real'))

		// Hidden (dot-prefixed) directories are ignored.
		await mkdir(join(storageDir, '.quicklaunch-latest'))

		const states = await getEnvironmentStates(storageDir)
		assert.equal(states.justafolder, 'folder')
		assert.equal(typeof states.real, 'object')
		assert.ok(!('.quicklaunch-latest' in states))
	})
})

describe('renameEnvironment', () => {
	it('is a no-op when the names match', async () => {
		await writeNewEnvironment(storageDir, sampleEnv('same'))
		await assert.doesNotReject(renameEnvironment(storageDir, 'same', 'same'))
	})

	it('rejects renaming onto an existing environment', async () => {
		await writeNewEnvironment(storageDir, sampleEnv('a'))
		await writeNewEnvironment(storageDir, sampleEnv('b'))
		await assert.rejects(renameEnvironment(storageDir, 'a', 'b'), EnvironmentError)
	})
})
