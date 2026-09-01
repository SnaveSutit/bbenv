import { ValidationError } from './errors'

const LAUNCH_ARG_REGEX = /(".+?"|'.+?'|[^ =]+)+/g

/**
 * Splits a launch-argument string into an array, keeping quoted spans together.
 * @example
 * parseBlockbenchLaunchArgs('--foo "a b" --bar') // ['--foo', '"a b"', '--bar']
 */
export function parseBlockbenchLaunchArgs(strArgs: string): string[] {
	const matches = strArgs.match(LAUNCH_ARG_REGEX)
	if (!matches) {
		return []
	}
	return matches.slice()
}

/**
 * Throws a {@link ValidationError} if the launch arguments contain something
 * EnvBench cannot allow.
 *
 * `--userData` is rejected because it would break the isolation between
 * environments.
 */
export function validateBlockbenchLaunchArgs(args: string[]): void {
	if (args.includes('--userData')) {
		throw new ValidationError(
			'You cannot use the --userData flag with EnvBench, as it would break the isolation of the Blockbench instance.'
		)
	}
}
