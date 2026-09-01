import { terminal as $ } from 'terminal-kit'
import type { DownloadHooks } from '../core/blockbench'

export function log() {
	return $.gray('[').blue('EnvBench').gray('] ')
}

export async function confirmPrompt() {
	return await $.yesOrNo({
		yes: ['y', 'ENTER'],
		no: ['n', 'ESCAPE'],
	}).promise
}

function formatBytes(bytes: number): string {
	return (bytes / (1024 * 1024)).toFixed(2) + 'MB'
}

/**
 * Builds EnvBench download hooks that render a `terminal-kit` progress bar,
 * matching the CLI's original download output.
 */
export function downloadProgressHooks(): DownloadHooks {
	// terminal-kit's progress bar needs a TTY; fall back to plain lines without one.
	if (!process.stdout.isTTY) {
		return {
			onDownloadStart: version => log().cyan(`Downloading Blockbench ${version}...\n`),
			onDownloadComplete: () => log().green('Blockbench downloaded successfully.\n'),
		}
	}

	let progressBar: ReturnType<typeof $.progressBar> | undefined

	return {
		onDownloadStart(version) {
			log().cyan(`Downloading Blockbench ${version}...\n`)
			progressBar = $.progressBar({
				title: `0000.00MB / 0000.00MB`,
				titleStyle: $.cyan,
				barBracketStyle: $.gray,
				barChar: '#',
				barHeadChar: '#',
				barStyle: $.green,
				minRefreshTime: 250,
			})
		},
		onProgress(progress) {
			progressBar?.update({
				progress: progress.percent,
				title: `${formatBytes(progress.transferred)} / ${formatBytes(progress.total)}`,
			})
		},
		onDownloadComplete() {
			progressBar?.stop()
			$('\n')
			log().green('Blockbench downloaded successfully.\n')
		},
	}
}
