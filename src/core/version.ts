/**
 * The running EnvBench version.
 *
 * `ENVBENCH_INJECTED_VERSION` is replaced with a string literal by the bundler
 * at build time (see `.scripts/build.ts`). When running through `bun` directly
 * (dev / tests) it is not defined, so we fall back to a sentinel.
 */
export const ENVBENCH_VERSION =
	typeof ENVBENCH_INJECTED_VERSION === 'string' ? ENVBENCH_INJECTED_VERSION : '0.0.0-dev'
