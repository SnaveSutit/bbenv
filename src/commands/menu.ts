import { terminal as $, Terminal } from 'terminal-kit'
import { registerCommand } from '../commandRegistry'
import {
	environmentExists,
	getEnvironmentFile,
	getEnvironmentStates,
	setEnvironmentFile,
	validateBlockbenchLaunchArgs,
} from '../environmentHandler'
import { confirmPrompt, log, parseBlockbenchLaunchArgs } from '../util'
import { remove } from './delete'
import { info } from './info'
import { launch } from './launch'
import { rename } from './rename'

interface Action {
	action(name: string): Promise<void>
}

const ACTIONS: Record<string, Action> = {
	Launch: {
		async action(name: string) {
			await launch(name, {})
		},
	},
	Info: {
		async action(name: string) {
			await info(name)
		},
	},
	Rename: {
		async action(name: string) {
			log().green(`Enter a new name for `).cyan(name).green(`: `)
			const newName = await $.inputField({
				cancelable: true,
				style: $.cyan,
			}).promise
			$('\n')
			if (!newName) {
				log().red('Canceled!\n')
				process.exit(0)
			}
			await rename(name, newName, { confirm: true })
		},
	},
	'Modify Blockbench Launch Arguments': {
		async action(name: string) {
			if (!(await environmentExists(name))) {
				log().red(`Environment `).cyan(name).red(` does not exist!\n`)
				process.exit(1)
			}
			const environment = await getEnvironmentFile(name)

			const stringArgs = environment.launchArgs ? environment.launchArgs.join(' ') : ''

			log()
				.yellow('Current launch arguments for ')
				.cyan(name)
				.yellow(`\n: `)
				.red(stringArgs || 'N/A')('\n')

			log().green(`Enter new launch arguments for `).cyan(name)(`\n: `)
			const result = await $.inputField({
				cancelable: true,
				default: stringArgs,
			}).promise

			$('\n')
			if (result === undefined) {
				log().red('Canceled!\n')
				process.exit(0)
			}
			const newArgs = parseBlockbenchLaunchArgs(result)
			validateBlockbenchLaunchArgs(newArgs)

			if (newArgs.length === 0) {
				log().yellow('Remove custom launch arguments for ').cyan(name).yellow('?\n')
			} else {
				log()
					.yellow('Change launch arguments for ')
					.cyan(name)
					.yellow(` to:\n`)
					.cyan(newArgs.join(' '))
					.yellow('\nConfirm? [y/n]\n')
			}

			if (!(await confirmPrompt())) {
				log().red('Operation cancelled!\n')
				process.exit(0)
			}

			environment.launchArgs = newArgs
			await setEnvironmentFile(name, environment)

			log().green(`Launch arguments for `).cyan(name).green(` updated successfully!\n`)
		},
	},
	Delete: {
		async action(name: string) {
			await remove(name, {})
		},
	},
}

export async function menu() {
	const environments = await getEnvironmentStates()
	const length = Object.keys(environments).length
	if (length === 0) {
		log().red('No environments found!\n')
		log().yellow('Create a new environment with the "--create <name>" command.\n')
		process.exit(1)
	}
	log().green(
		'Select an environment: (Use arrow keys to navigate, ENTER to select, ESC to cancel.)'
	)
	let response: Terminal.SingleLineMenuResponse
	response = await $.singleColumnMenu(Object.keys(environments), {
		cancelable: true,
		leftPadding: '- ',
		style: $.green,
		selectedStyle: $.black.bgGreen,
	}).promise
	$('\n')
	if (response.canceled) {
		log().red('Canceled!\n')
		process.exit(0)
	}

	const environment = response.selectedText
	log().green(`Select an action for `).cyan(environment)
	response = await $.singleColumnMenu(Object.keys(ACTIONS), {
		cancelable: true,
		leftPadding: '- ',
		style: $.green,
		selectedStyle: $.black.bgGreen,
	}).promise
	$('\n')
	if (response.canceled) {
		log().red('Canceled!\n')
		process.exit(0)
	}

	const action = response.selectedText
	await ACTIONS[action].action(environment)

	process.exit(0)
}

registerCommand(program => {
	program
		.command('menu')
		.usage('[options]')
		.description('open the environment select menu')
		.action(menu)
})
