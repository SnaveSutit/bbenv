import { default as chalk, chalkStderr } from 'chalk'
import { Help } from 'commander'
import stripAnsi from 'strip-ansi'
import wrapAnsi from 'wrap-ansi'
import { registerCommand } from './commandRegistry'

export class EnvBenchHelp extends Help {
	chalk = chalk

	constructor() {
		super()
	}

	prepareContext(contextOptions: any) {
		super.prepareContext(contextOptions)
		if (contextOptions?.error) {
			this.chalk = chalkStderr
		}
	}

	displayWidth(str: string) {
		return stripAnsi(str).length
	}

	boxWrap(str: string, width: number) {
		return wrapAnsi(str, width, { hard: true })
	}

	styleTitle(str: string) {
		return this.chalk.bold(str)
	}
	styleCommandText(str: string) {
		return this.chalk.cyan(str)
	}
	styleCommandDescription(str: string) {
		return this.chalk.magenta(str)
	}
	styleDescriptionText(str: string) {
		return this.chalk.italic(str)
	}
	styleOptionText(str: string) {
		return this.chalk.green(str)
	}
	styleArgumentText(str: string) {
		return this.chalk.yellow(str)
	}
	styleSubcommandText(str: string) {
		return this.chalk.blue(str)
	}
}

registerCommand(program => {
	program.helpCommand('help [cmd]', 'Display help for a specific command.')
	program.configureOutput({
		outputError(str, write) {
			write(chalkStderr.red(str))
		},
	})
})
