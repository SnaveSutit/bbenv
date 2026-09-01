/**
 * The current EnvBench version, injected at build time by the bundler (see
 * `.scripts/build.ts`) from `package.json`. It is `undefined` when running
 * through `bun` directly (dev / tests); use `ENVBENCH_VERSION` from
 * `./core/version` rather than referencing this directly.
 */
declare const ENVBENCH_INJECTED_VERSION: string | undefined
