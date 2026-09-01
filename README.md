<div id="toc" align=center>
    <picture>
        <img src="assets/envbench-logo.svg" alt="Envbench Logo" width="128" height="128">
    </picture>
    <ul style="list-style: none;">
        <summary>
            <h1>Envbench</h1>
        </summary>
    </ul>
    <p>Envbench is a powerful command-line tool that provides a simple interface for managing multiple Blockbench environments.</p>
</div>

---

# 💡 Why Use Envbench?

There are several reasons you might want to have multiple environments:

-   Keep work and personal projects separate to prevent NDA risks when opening Blockbench.
-   Maintain clean environments for developing and testing plugins.
-   Have multiple versions of Blockbench installed without conflicts.
-   Save different instances for different projects, ensuring your start menu only displays relevant models.

# 📦 Installation

### ⚠️ Requirements

-   [Node.js](https://nodejs.org/en/download/prebuilt-installer)

### 🪜 Steps

1. Open a terminal (`cmd` or `PowerShell` on Windows).
2. Run the following command:
    ```bash
    npm i -g envbench
    ```
3. Verify the installation by running:
    ```bash
    envbench
    ```
    If installed correctly, you should see Envbench's help information.

# ⌨️ Getting Started

### Usage

```bash
envbench <command> [options]
```

> [!TIP]
> Running `envbench` without arguments will list all available commands.

### Creating a new environment

```bash
envbench create my-environment
```

### Starting your environment

```bash
envbench start my-environment
```

# 📚 Using Envbench as a library

Envbench also ships a programmatic API (ESM and CommonJS, with TypeScript types).
Install it as a normal dependency and import the `Envbench` class:

```bash
npm i envbench
```

```ts
import { Envbench, EnvironmentError } from 'envbench'

// Defaults to ~/.envbench; pass storageDir to use somewhere else.
const eb = new Envbench()

await eb.createEnvironment('work', { blockbenchVersion: 'latest' })

const environments = await eb.listEnvironments()

// launch() resolves to the spawned Blockbench child process.
const child = await eb.launch('work')
child.on('exit', code => console.log('Blockbench closed', code))

try {
	await eb.getEnvironment('missing')
} catch (err) {
	if (err instanceof EnvironmentError) {
		// The API throws typed errors instead of writing to the terminal or
		// exiting the process.
	}
}
```

Download progress is reported through optional hooks:

```ts
await eb.installVersion('4.10.0', {
	onDownloadStart: version => console.log('downloading', version),
	onProgress: ({ percent }) => console.log(`${Math.round(percent * 100)}%`),
	onDownloadComplete: version => console.log('done', version),
})
```
