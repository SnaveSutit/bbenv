/**
 * Base class for every error EnvBench throws on an expected failure (a missing
 * environment, an invalid version, a failed download, ...). Library consumers
 * can catch this to distinguish handled failures from unexpected crashes.
 */
export class EnvbenchError extends Error {
	constructor(message: string) {
		super(message)
		this.name = new.target.name
	}
}

/** An environment is missing, already exists, or has a malformed file. */
export class EnvironmentError extends EnvbenchError {}

/** A name or set of launch arguments failed validation. */
export class ValidationError extends EnvbenchError {}

/** A Blockbench version is unknown, unsupported, or could not be resolved. */
export class BlockbenchVersionError extends EnvbenchError {}

/** An operation needs network access but EnvBench is offline. */
export class OfflineError extends EnvbenchError {
	constructor(message = 'You are offline, so this operation cannot continue.') {
		super(message)
	}
}

/** Downloading a Blockbench portable failed. */
export class DownloadError extends EnvbenchError {}

/** A downloaded or installed Blockbench portable failed its integrity check. */
export class IntegrityError extends EnvbenchError {}

/** The current platform is not supported by EnvBench. */
export class UnsupportedPlatformError extends EnvbenchError {
	constructor(platform: string) {
		super(`Unsupported platform: ${platform}`)
	}
}

/** Launching Blockbench failed. */
export class LaunchError extends EnvbenchError {}
