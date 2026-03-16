import { describe, it, expect, beforeEach } from 'vitest';
import { FakePtyProcess, FakePtyFactory } from './pty-service.js';

describe('FakePtyProcess', () => {
	let pty: FakePtyProcess;

	beforeEach(() => {
		pty = new FakePtyProcess();
	});

	it('has a pid', () => {
		expect(pty.pid).toBe(12345);
	});

	it('tracks written data', () => {
		pty.write('hello');
		pty.write(' world');
		expect(pty.getWritten()).toEqual(['hello', ' world']);
	});

	it('delivers simulated output to onData handlers', () => {
		const received: string[] = [];
		pty.onData((data) => received.push(data));
		pty.simulateOutput('$ foo\r\n');
		expect(received).toEqual(['$ foo\r\n']);
	});

	it('delivers to multiple onData handlers', () => {
		const a: string[] = [];
		const b: string[] = [];
		pty.onData((d) => a.push(d));
		pty.onData((d) => b.push(d));
		pty.simulateOutput('data');
		expect(a).toEqual(['data']);
		expect(b).toEqual(['data']);
	});

	it('unsubscribes onData handler', () => {
		const received: string[] = [];
		const unsub = pty.onData((d) => received.push(d));
		unsub();
		pty.simulateOutput('ignored');
		expect(received).toHaveLength(0);
	});

	it('tracks resize calls', () => {
		pty.resize(120, 40);
		expect(pty.getLastSize()).toEqual({ cols: 120, rows: 40 });
	});

	it('returns last resize dimensions', () => {
		pty.resize(80, 24);
		pty.resize(100, 30);
		expect(pty.getLastSize()).toEqual({ cols: 100, rows: 30 });
	});

	it('returns undefined for last size when no resize called', () => {
		expect(pty.getLastSize()).toBeUndefined();
	});

	it('delivers simulated exit to onExit handlers', () => {
		const codes: number[] = [];
		pty.onExit((code) => codes.push(code));
		pty.simulateExit(0);
		expect(codes).toEqual([0]);
	});

	it('delivers non-zero exit codes', () => {
		const codes: number[] = [];
		pty.onExit((code) => codes.push(code));
		pty.simulateExit(127);
		expect(codes).toEqual([127]);
	});

	it('unsubscribes onExit handler', () => {
		const codes: number[] = [];
		const unsub = pty.onExit((c) => codes.push(c));
		unsub();
		pty.simulateExit(1);
		expect(codes).toHaveLength(0);
	});

	it('marks as killed when kill() is called', () => {
		expect(pty.killed).toBe(false);
		pty.kill();
		expect(pty.killed).toBe(true);
	});
});

describe('FakePtyFactory', () => {
	it('creates a FakePtyProcess with correct command and args', () => {
		const factory = new FakePtyFactory();
		factory.spawn('docker', ['exec', '-it', 'c1', '/bin/bash'], { cols: 80, rows: 24 });
		expect(factory.lastCommand).toBe('docker');
		expect(factory.lastArgs).toEqual(['exec', '-it', 'c1', '/bin/bash']);
		expect(factory.lastCreated).toBeInstanceOf(FakePtyProcess);
	});

	it('stores spawn options', () => {
		const factory = new FakePtyFactory();
		factory.spawn('bash', [], { cols: 120, rows: 40, cwd: '/tmp' });
		expect(factory.lastOptions).toEqual({ cols: 120, rows: 40, cwd: '/tmp' });
	});
});
