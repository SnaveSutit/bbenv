/**
 * The current EnvBench version, injected at build time by esbuild (see
 * `.scripts/esbuild.ts`) from `package.json`. It is `undefined` when running
 * through `tsx` (dev / tests); use `ENVBENCH_VERSION` from `./core/version`
 * rather than referencing this directly.
 */
declare const ENVBENCH_INJECTED_VERSION: string | undefined
