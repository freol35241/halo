import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import type { FeedEntry } from '$lib/types/feed';
import HumanEntry from './HumanEntry.svelte';
import AssistantEntry from './AssistantEntry.svelte';
import ToolEntry from './ToolEntry.svelte';
import CommandEntry from './CommandEntry.svelte';
import OutputEntry from './OutputEntry.svelte';
import SystemEntry from './SystemEntry.svelte';
import SessionFeed from './SessionFeed.svelte';
import InputBar from './InputBar.svelte';
import QuickCommands from './QuickCommands.svelte';

function makeEntry(overrides: Partial<FeedEntry> = {}): FeedEntry {
	return {
		id: 'e1',
		sessionId: 's1',
		ts: '2026-03-16T10:00:00Z',
		role: 'human',
		content: 'Hello world',
		...overrides
	};
}

// --- HumanEntry ---
describe('HumanEntry', () => {
	it('renders content', () => {
		render(HumanEntry, { props: { entry: makeEntry({ role: 'human', content: 'Say hello' }) } });
		expect(screen.getByText('Say hello')).toBeTruthy();
	});

	it('shows "you" label', () => {
		render(HumanEntry, { props: { entry: makeEntry({ role: 'human' }) } });
		expect(screen.getByText('you')).toBeTruthy();
	});

	it('shows timestamp', () => {
		render(HumanEntry, {
			props: { entry: makeEntry({ role: 'human', ts: '2026-03-16T10:00:00Z' }) }
		});
		// Timestamp is displayed (formatted or raw)
		const el = document.querySelector('[data-testid="human-ts"]');
		expect(el).toBeTruthy();
	});

	it('has human-entry class or data attribute', () => {
		const { container } = render(HumanEntry, { props: { entry: makeEntry({ role: 'human' }) } });
		expect(container.querySelector('[data-role="human"]')).toBeTruthy();
	});
});

// --- AssistantEntry ---
describe('AssistantEntry', () => {
	it('renders content', () => {
		render(AssistantEntry, {
			props: { entry: makeEntry({ role: 'assistant', content: 'I can help with that.' }) }
		});
		expect(screen.getByText('I can help with that.')).toBeTruthy();
	});

	it('shows "claude" label', () => {
		render(AssistantEntry, { props: { entry: makeEntry({ role: 'assistant' }) } });
		expect(screen.getByText('claude')).toBeTruthy();
	});

	it('renders thinking block when metadata.thinking is set', () => {
		const entry = makeEntry({
			role: 'assistant',
			content: 'Result',
			metadata: { thinking: 'Let me think about this...' }
		});
		render(AssistantEntry, { props: { entry } });
		expect(screen.getByText('Thinking')).toBeTruthy();
	});

	it('does not render thinking block when no thinking metadata', () => {
		render(AssistantEntry, { props: { entry: makeEntry({ role: 'assistant' }) } });
		expect(screen.queryByText('Thinking')).toBeNull();
	});
});

// --- ToolEntry ---
describe('ToolEntry', () => {
	it('renders tool name from metadata', () => {
		const entry = makeEntry({
			role: 'tool',
			content: 'file content here',
			metadata: { tool: 'create_file', path: 'src/main.rs' }
		});
		render(ToolEntry, { props: { entry } });
		expect(screen.getByText('create_file')).toBeTruthy();
	});

	it('renders path from metadata', () => {
		const entry = makeEntry({
			role: 'tool',
			content: 'file content here',
			metadata: { tool: 'create_file', path: 'src/main.rs' }
		});
		render(ToolEntry, { props: { entry } });
		expect(screen.getByText('src/main.rs')).toBeTruthy();
	});

	it('is collapsed by default (content not visible)', () => {
		const entry = makeEntry({
			role: 'tool',
			content: 'secret file content',
			metadata: { tool: 'read_file', path: 'src/lib.rs' }
		});
		render(ToolEntry, { props: { entry } });
		expect(screen.queryByText('secret file content')).toBeNull();
	});

	it('has a toggle button', () => {
		const entry = makeEntry({ role: 'tool', metadata: { tool: 'bash', path: '' } });
		render(ToolEntry, { props: { entry } });
		expect(document.querySelector('button')).toBeTruthy();
	});
});

// --- CommandEntry ---
describe('CommandEntry', () => {
	it('renders command content', () => {
		render(CommandEntry, {
			props: { entry: makeEntry({ role: 'command', content: 'cargo test' }) }
		});
		expect(screen.getByText('cargo test')).toBeTruthy();
	});

	it('shows $ prefix', () => {
		render(CommandEntry, { props: { entry: makeEntry({ role: 'command', content: 'ls -la' }) } });
		expect(screen.getByText('$')).toBeTruthy();
	});

	it('shows timestamp', () => {
		const { container } = render(CommandEntry, {
			props: { entry: makeEntry({ role: 'command' }) }
		});
		expect(container.querySelector('[data-testid="command-ts"]')).toBeTruthy();
	});
});

// --- OutputEntry ---
describe('OutputEntry', () => {
	it('renders output content', () => {
		render(OutputEntry, {
			props: { entry: makeEntry({ role: 'output', content: 'test passed' }) }
		});
		expect(screen.getByText('test passed')).toBeTruthy();
	});

	it('renders in a pre/code element for monospace', () => {
		const { container } = render(OutputEntry, {
			props: { entry: makeEntry({ role: 'output', content: 'output text' }) }
		});
		expect(container.querySelector('pre')).toBeTruthy();
	});
});

// --- SystemEntry ---
describe('SystemEntry', () => {
	it('renders system content', () => {
		render(SystemEntry, {
			props: { entry: makeEntry({ role: 'system', content: 'Phase 1: SCOPE' }) }
		});
		expect(screen.getByText('Phase 1: SCOPE')).toBeTruthy();
	});

	it('has data-role="system" attribute', () => {
		const { container } = render(SystemEntry, {
			props: { entry: makeEntry({ role: 'system', content: 'Test' }) }
		});
		expect(container.querySelector('[data-role="system"]')).toBeTruthy();
	});
});

// --- SessionFeed ---
describe('SessionFeed', () => {
	it('renders all entries', () => {
		const entries: FeedEntry[] = [
			makeEntry({ id: 'e1', role: 'human', content: 'First message' }),
			makeEntry({ id: 'e2', role: 'assistant', content: 'Second message' }),
			makeEntry({ id: 'e3', role: 'command', content: 'cargo build' })
		];
		render(SessionFeed, { props: { entries } });
		expect(screen.getByText('First message')).toBeTruthy();
		expect(screen.getByText('Second message')).toBeTruthy();
		expect(screen.getByText('cargo build')).toBeTruthy();
	});

	it('renders empty state when no entries', () => {
		const { container } = render(SessionFeed, { props: { entries: [] } });
		expect(container.querySelector('[data-testid="session-feed"]')).toBeTruthy();
	});

	it('shows running indicator when isRunning is true', () => {
		render(SessionFeed, { props: { entries: [], isRunning: true } });
		expect(screen.getByText('Running...')).toBeTruthy();
	});

	it('does not show running indicator when isRunning is false', () => {
		render(SessionFeed, { props: { entries: [], isRunning: false } });
		expect(screen.queryByText('Running...')).toBeNull();
	});
});

// --- InputBar ---
describe('InputBar', () => {
	it('renders a text input', () => {
		const { container } = render(InputBar, { props: { sessionType: 'claude' } });
		expect(container.querySelector('input, textarea')).toBeTruthy();
	});

	it('shows chat placeholder for claude session type', () => {
		const { container } = render(InputBar, { props: { sessionType: 'claude' } });
		const input = container.querySelector('input, textarea') as HTMLInputElement;
		expect(input?.placeholder).toContain('Message Claude');
	});

	it('shows command placeholder for terminal session type', () => {
		const { container } = render(InputBar, { props: { sessionType: 'terminal' } });
		const input = container.querySelector('input, textarea') as HTMLInputElement;
		expect(input?.placeholder).toContain('command');
	});

	it('shows $ prefix for non-claude session', () => {
		render(InputBar, { props: { sessionType: 'terminal' } });
		expect(screen.getByText('$')).toBeTruthy();
	});

	it('does not show $ prefix for claude session', () => {
		render(InputBar, { props: { sessionType: 'claude' } });
		expect(screen.queryByText('$')).toBeNull();
	});
});

// --- QuickCommands ---
describe('QuickCommands', () => {
	it('renders pill buttons for each command', () => {
		const { container } = render(QuickCommands, {
			props: { commands: ['cargo test', 'git diff --stat'] }
		});
		const buttons = container.querySelectorAll('button');
		expect(buttons.length).toBe(2);
	});

	it('renders command text in buttons', () => {
		render(QuickCommands, { props: { commands: ['cargo test', 'git log'] } });
		expect(screen.getByText('cargo test')).toBeTruthy();
		expect(screen.getByText('git log')).toBeTruthy();
	});

	it('renders nothing when commands is empty', () => {
		const { container } = render(QuickCommands, { props: { commands: [] } });
		const buttons = container.querySelectorAll('button');
		expect(buttons.length).toBe(0);
	});
});
