import type { IncomingMessage } from 'http';
import type { Duplex } from 'stream';
import { WebSocketServer, type WebSocket } from 'ws';
import { TerminalSessionManager, type ClientToServerMessage } from './terminal-manager.js';
import { NodePtyFactory } from './node-pty-process.js';
import { getDb } from '../db/index.js';
import { getSessionById } from '../db/sessions.js';
import { createFeedEntry } from '../db/feed-entries.js';
import { emitFeedEntry } from '../sessions/feed-emitter.js';
import { randomUUID } from 'crypto';
import type { FeedEntry } from '$lib/types/feed.js';
import type { FeedRole } from '$lib/types/feed.js';

// ---------------------------------------------------------------------------
// Singletons (one per process / Vite SSR module instance)
// ---------------------------------------------------------------------------

let wss: WebSocketServer | null = null;
let manager: TerminalSessionManager | null = null;

function getWss(): WebSocketServer {
	if (!wss) wss = new WebSocketServer({ noServer: true });
	return wss;
}

function getManager(): TerminalSessionManager {
	if (!manager) {
		const db = getDb();
		const feedHandler = {
			addEntry(sessionId: string, role: string, content: string): void {
				const row = createFeedEntry(db, {
					id: randomUUID().replace(/-/g, ''),
					session_id: sessionId,
					role,
					content
				});
				const entry: FeedEntry = {
					id: row.id,
					sessionId: row.session_id,
					role: row.role as FeedRole,
					content: row.content,
					metadata: row.metadata as FeedEntry['metadata'],
					ts: row.created_at
				};
				emitFeedEntry(sessionId, entry);
			}
		};
		manager = new TerminalSessionManager(new NodePtyFactory(), feedHandler);
	}
	return manager;
}

// ---------------------------------------------------------------------------
// URL pattern: /ws/terminal/<sessionId>
// ---------------------------------------------------------------------------

const WS_PATH = /^\/ws\/terminal\/([^/]+)$/;

export function handleUpgrade(req: IncomingMessage, socket: Duplex, head: Buffer): void {
	const url = req.url ?? '';
	const match = url.match(WS_PATH);
	if (!match) {
		socket.destroy();
		return;
	}

	const sessionId = match[1];

	getWss().handleUpgrade(req, socket, head, (ws: WebSocket) => {
		handleTerminalWebSocket(sessionId, ws);
	});
}

export function handleTerminalWebSocket(sessionId: string, ws: WebSocket): void {
	const db = getDb();
	const sessionRow = getSessionById(db, sessionId);

	if (!sessionRow) {
		ws.close(4004, 'Session not found');
		return;
	}

	if (sessionRow.type !== 'terminal') {
		ws.close(4005, 'Session is not a terminal session');
		return;
	}

	const mgr = getManager();

	const connection = {
		send(msg: { type: string; data?: string; code?: number }): void {
			if (ws.readyState === ws.OPEN) {
				ws.send(JSON.stringify(msg));
			}
		},
		onMessage(handler: (msg: ClientToServerMessage) => void): void {
			ws.on('message', (data: Buffer): void => {
				try {
					const parsed = JSON.parse(data.toString()) as ClientToServerMessage;
					handler(parsed);
				} catch {
					// ignore malformed messages
				}
			});
		},
		close(): void {
			ws.close();
		}
	};

	mgr.connect(
		{
			sessionId,
			containerId: sessionRow.container_id,
			cols: 80,
			rows: 24
		},
		connection
	);

	ws.on('close', (): void => {
		mgr.disconnect(sessionId);
	});
}
