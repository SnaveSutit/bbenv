import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { ValidationError } from './errors'
import { parseBlockbenchLaunchArgs, validateBlockbenchLaunchArgs } from './launchArgs'

describe('parseBlockbenchLaunchArgs', () => {
	it('returns an empty array for a blank string', () => {
		assert.deepEqual(parseBlockbenchLaunchArgs(''), [])
		assert.deepEqual(parseBlockbenchLaunchArgs('   '), [])
	})

	it('splits plain arguments on whitespace', () => {
		assert.deepEqual(parseBlockbenchLaunchArgs('--foo --bar baz'), ['--foo', '--bar', 'baz'])
	})

	it('keeps quoted spans together', () => {
		assert.deepEqual(parseBlockbenchLaunchArgs('--path "a b c" --x'), [
			'--path',
			'"a b c"',
			'--x',
		])
	})
})

describe('validateBlockbenchLaunchArgs', () => {
	it('accepts ordinary arguments', () => {
		assert.doesNotThrow(() => validateBlockbenchLaunchArgs(['--enable-logging', '--foo']))
	})

	it('rejects --userData', () => {
		assert.throws(
			() => validateBlockbenchLaunchArgs(['--userData', '/somewhere']),
			ValidationError
		)
	})
})
