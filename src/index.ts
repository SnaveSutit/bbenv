// The order of these imports is important
import './env'
//
import './commands//'
//
import { Command, Help } from 'commander'
import { terminal as $ } from 'terminal-kit'
import { description } from '../package.json'
import { registerCommands } from './commandRegistry'
import { EnvBenchHelp } from './commands/help'
import { assertStorageFolder } from './environmentHandler'
import { log, updateOnlineStatus } from './util'

class EnvBenchCommand extends Command {
	createCommand(name?: string): Command {
		return new EnvBenchCommand(name)
	}
	createHelp(): Help {
		return new EnvBenchHelp()
	}
}

async function main() {
	if (process.env.NODE_ENV === 'development') {
		log()
			.yellow.underline('WARNING:')
			.yellow(' Running in ')
			.yellow.underline('development mode!')
			.yellow(' Some features may not work as expected.\n\n')
	}

	const program = new EnvBenchCommand()
	program.name('envbench').description(description)

	await registerCommands(program)

	$.addListener('key', (name: string) => {
		if (name === 'CTRL_C') {
			$('\n')
			log().red('Operation cancelled by user!\n')
			process.exit(0)
		}
	})

	try {
		await Promise.all([updateOnlineStatus(), assertStorageFolder()])
		await program.parseAsync()
	} catch (err: any) {
		$('\n\n')
		log().red('EnvBench has crashed with the following error:\n')
		console.error(err)
		$('\n')
		log().red('Please report this issue at https://github.com/snavesutit/envbench/issues.\n')
		process.exit(1)
	}
}

void main()
