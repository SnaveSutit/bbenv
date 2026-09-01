import { Command } from 'commander'

const COMMAND_REGISTRY = new Set<(program: Command) => Promise<void> | void>()

export function registerCommand(definer: (program: Command) => Promise<void> | void) {
	COMMAND_REGISTRY.add(definer)
}

export async function registerCommands(program: Command) {
	for (const definer of COMMAND_REGISTRY) {
		await definer(program)
	}
}
