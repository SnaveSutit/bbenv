import assert from 'node:assert/strict'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { describe, it } from 'node:test'
import { resolvePaths } from './context'

describe('resolvePaths', () => {
	it('defaults to ~/.envbench and its .portables sub-folder', () => {
		const { storageDir, portablesCache } = resolvePaths()
		assert.equal(storageDir, join(homedir(), '.envbench'))
		assert.equal(portablesCache, join(homedir(), '.envbench', '.portables'))
	})

	it('derives the portables cache from a custom storage dir', () => {
		const { storageDir, portablesCache } = resolvePaths({ storageDir: '/tmp/envs' })
		assert.equal(storageDir, '/tmp/envs')
		assert.equal(portablesCache, join('/tmp/envs', '.portables'))
	})

	it('lets an explicit portables cache win', () => {
		const { portablesCache } = resolvePaths({
			storageDir: '/tmp/envs',
			portablesCache: '/var/cache/bb',
		})
		assert.equal(portablesCache, '/var/cache/bb')
	})
})
