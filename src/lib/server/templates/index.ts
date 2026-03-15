import type { Template } from '$lib/types/template.js';

export const BUILT_IN_TEMPLATES: Template[] = [
	{
		id: 'tmpl-rust',
		name: 'Rust Systems',
		description:
			'Rust development environment with nightly toolchain, cargo, clippy, and wasmtime.',
		tags: ['rust', 'systems', 'wasm'],
		devcontainerConfig: {
			image: 'mcr.microsoft.com/devcontainers/rust:1',
			features: {
				'ghcr.io/devcontainers/features/python:1': { version: '3.12' }
			},
			postCreateCommand: 'rustup component add clippy rustfmt',
			customizations: {
				vscode: {
					extensions: ['rust-lang.rust-analyzer', 'vadimcn.vscode-lldb', 'tamasfe.even-better-toml']
				}
			}
		}
	},
	{
		id: 'tmpl-svelte',
		name: 'SvelteKit Web',
		description:
			'Node.js 20 environment with pnpm, Playwright, and Tailwind for SvelteKit development.',
		tags: ['svelte', 'node', 'web', 'typescript'],
		devcontainerConfig: {
			image: 'mcr.microsoft.com/devcontainers/javascript-node:20',
			features: {
				'ghcr.io/devcontainers/features/node:1': { version: '20', pnpmVersion: 'latest' }
			},
			postCreateCommand: 'npm install -g pnpm',
			customizations: {
				vscode: {
					extensions: [
						'svelte.svelte-vscode',
						'bradlc.vscode-tailwindcss',
						'dbaeumer.vscode-eslint',
						'esbenp.prettier-vscode'
					]
				}
			},
			forwardPorts: [5173, 4173]
		}
	},
	{
		id: 'tmpl-python-ml',
		name: 'Python ML',
		description: 'Python 3.12 environment with uv, numpy, pandas, and torch for machine learning.',
		tags: ['python', 'ml', 'data-science'],
		devcontainerConfig: {
			image: 'mcr.microsoft.com/devcontainers/python:3.12',
			features: {
				'ghcr.io/devcontainers/features/python:1': { version: '3.12', installTools: true }
			},
			postCreateCommand: 'pip install uv && uv pip install numpy pandas torch',
			customizations: {
				vscode: {
					extensions: ['ms-python.python', 'ms-python.pylance', 'ms-toolsai.jupyter']
				}
			}
		}
	},
	{
		id: 'tmpl-blank',
		name: 'Blank',
		description: 'Minimal Ubuntu 24.04 base with git and curl. Build your own environment.',
		tags: ['blank', 'ubuntu', 'minimal'],
		devcontainerConfig: {
			image: 'mcr.microsoft.com/devcontainers/base:ubuntu-24.04',
			postCreateCommand: 'apt-get update && apt-get install -y git curl'
		}
	}
];

export function getTemplateById(id: string): Template | undefined {
	return BUILT_IN_TEMPLATES.find((t) => t.id === id);
}

export type ValidationResult = { success: true } | { success: false; error: string };

export function validateTemplate(template: Template): ValidationResult {
	if (!template.id) {
		return { success: false, error: 'Template id is required' };
	}
	if (!template.name) {
		return { success: false, error: 'Template name is required' };
	}
	if (!template.description) {
		return { success: false, error: 'Template description is required' };
	}
	if (!template.devcontainerConfig?.image) {
		return { success: false, error: 'Template devcontainerConfig.image is required' };
	}
	return { success: true };
}

// Validate all built-in templates at module load time
for (const template of BUILT_IN_TEMPLATES) {
	const result = validateTemplate(template);
	if (!result.success) {
		throw new Error(`Built-in template '${template.id}' is invalid: ${result.error}`);
	}
}
