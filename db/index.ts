import * as schema from '@db/schema';
import { Pool } from '@neondatabase/serverless';
import { sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/neon-serverless';
import { WebSocket } from 'ws';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL must be set. Did you forget to provision a database?');
}

let pool: Pool | null = null;
let ws: WebSocket | null = null;

const createWebSocket = (url: string): WebSocket => {
  const wsUrl = url
    .replace(/^postgres:\/\//, 'wss://')
    .replace(/^postgresql:\/\//, 'wss://')
    .split('?')[0];
  console.log('[Database] Creating WebSocket connection to:', wsUrl.replace(/:[^:]*@/, ':****@'));

  const ws = new WebSocket(wsUrl, {
    perMessageDeflate: false,
    skipUTF8Validation: true,
    handshakeTimeout: 30000,
    maxPayload: 100 * 1024 * 1024,
    headers: {
      'User-Agent': 'neon-serverless',
      Upgrade: 'websocket',
      Connection: 'Upgrade',
      'Sec-WebSocket-Protocol': 'neon',
    },
  });

  ws.on('error', (error) => {
    console.error(
      '[Database] WebSocket error:',
      error instanceof Error ? error.message : String(error),
    );
  });

  ws.on('open', () => {
    console.log('[Database] WebSocket connection established');
  });

  ws.on('close', (code, reason) => {
    console.log('[Database] WebSocket connection closed:', code, reason.toString());
  });

  ws.on('ping', () => {
    try {
      ws.pong();
    } catch (error) {
      console.error(
        '[Database] Error sending pong:',
        error instanceof Error ? error.message : String(error),
      );
    }
  });

  return ws;
};

export const db = drizzle({
  connection: process.env.DATABASE_URL,
  schema,
  ws: createWebSocket(process.env.DATABASE_URL!),
});

export async function cleanup(): Promise<void> {
  try {
    if (pool) {
      await pool.end();
      pool = null;
      ws = null;
      console.log('[Database] Connection pool closed successfully');
    }
  } catch (error) {
    console.error(
      '[Database] Cleanup error:',
      error instanceof Error ? error.message : String(error),
    );
  }
}

process.once('SIGINT', cleanup);
process.once('SIGTERM', cleanup);

export { sql };
