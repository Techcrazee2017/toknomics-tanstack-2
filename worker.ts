import WebSocket from 'ws';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const EULER_API_KEY = process.env.EULER_API_KEY!;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !EULER_API_KEY) {
  console.error(
    '[Fatal] Missing required environment variables. Ensure SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, and EULER_API_KEY are set.'
  );
  process.exit(1);
}

// Use the Service Role client to bypass RLS policies during batch insertion
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

interface ActiveConnection {
  socket: WebSocket;
  handle: string;
  reconnectAttempts: number;
  reconnectTimer: ReturnType<typeof setTimeout> | null;
  isClosing: boolean;
}

const connectionPool = new Map<string, ActiveConnection>();
let writeBuffer: any[] = [];

const POLL_INTERVAL_MS = (Number(process.env.WORKER_POLL_INTERVAL_SECONDS) || 60) * 1000;
const MAX_CONNECTIONS = Number(process.env.WORKER_MAX_CONNECTIONS) || 100;
const BUFFER_FLUSH_THRESHOLD = 20;

// ==========================================
// 1. BUFFERED DATABASE WRITES
// ==========================================
// Flushes buffered gift events to Supabase in batches to prevent rate limiting
async function flushBuffer() {
  if (writeBuffer.length === 0) return;

  const toInsert = [...writeBuffer];
  writeBuffer = [];

  const { error } = await supabase.from('gift_transactions').insert(toInsert);
  if (error) {
    console.error('[Database Error] Failed to insert gift batch:', error.message);
    // Re-buffer the failed batch so data isn't lost
    writeBuffer.unshift(...toInsert);
  } else {
    console.log(`[Database] Flushed ${toInsert.length} gift transactions.`);
  }
}

// Flush every 1.5 seconds automatically
setInterval(flushBuffer, 1500);

// ==========================================
// 2. TARGET SOCKET LISTENER
// ==========================================
const MAX_RECONNECT_ATTEMPTS = 10;
const BASE_RECONNECT_DELAY_MS = 2000;
const MAX_RECONNECT_DELAY_MS = 60000;

function getReconnectDelay(attempts: number): number {
  // Exponential backoff with jitter, capped at MAX_RECONNECT_DELAY_MS
  const exp = Math.min(
    BASE_RECONNECT_DELAY_MS * Math.pow(2, attempts),
    MAX_RECONNECT_DELAY_MS
  );
  const jitter = Math.random() * 500;
  return exp + jitter;
}

function scheduleReconnect(handle: string) {
  const conn = connectionPool.get(handle);
  if (!conn || conn.isClosing) return;

  conn.reconnectAttempts += 1;

  if (conn.reconnectAttempts > MAX_RECONNECT_ATTEMPTS) {
    console.error(
      `[Reconnect] Max attempts (${MAX_RECONNECT_ATTEMPTS}) reached for @${handle}. Giving up.`
    );
    connectionPool.delete(handle);
    return;
  }

  const delay = getReconnectDelay(conn.reconnectAttempts);
  console.log(
    `[Reconnect] Scheduling retry #${conn.reconnectAttempts} for @${handle} in ${Math.round(delay)}ms`
  );

  conn.reconnectTimer = setTimeout(() => {
    connectionPool.delete(handle);
    startListening(handle);
  }, delay);
}

function startListening(targetHandle: string) {
  const cleanHandle = targetHandle.toLowerCase().replace('@', '').trim();
  if (connectionPool.has(cleanHandle)) return;

  const wsUrl = `wss://ws.eulerstream.com?uniqueId=${cleanHandle}&apiKey=${EULER_API_KEY}`;
  const ws = new WebSocket(wsUrl);

  const connectionMeta: ActiveConnection = {
    socket: ws,
    handle: cleanHandle,
    reconnectAttempts: 0,
    reconnectTimer: null,
    isClosing: false,
  };
  connectionPool.set(cleanHandle, connectionMeta);

  ws.on('open', () => {
    console.log(`[Connected] Monitoring live stream for: @${cleanHandle}`);
    connectionMeta.reconnectAttempts = 0;
  });

  ws.on('message', (raw: WebSocket.RawData) => {
    try {
      const data = JSON.parse(raw.toString());
      if (!data?.messages) return;

      for (const msg of data.messages) {
        // Filter specifically for gift events
        if (msg.type === 'WebcastGiftMessage' || msg.event === 'gift') {
          const gift = msg.data || msg;
          const count = Number(gift.repeatCount) || 1;
          const baseDiamonds = Number(gift.diamondCount) || 0;

          writeBuffer.push({
            room_id: gift.roomId ? String(gift.roomId) : null,
            sender_user_id: String(gift.user?.userId || gift.userId || 'unknown'),
            sender_unique_id: String(
              gift.user?.uniqueId || gift.uniqueId || 'anonymous'
            )
              .replace('@', '')
              .toLowerCase(),
            sender_avatar: gift.user?.profilePictureUrl || null,
            receiver_unique_id: cleanHandle,
            gift_id: String(gift.giftId || '0'),
            gift_name: gift.giftDetails?.giftName || gift.giftName || 'Gift',
            repeat_count: count,
            diamond_cost: baseDiamonds * count,
            created_at: new Date().toISOString(),
          });

          // Flush immediately if buffer reaches the threshold
          if (writeBuffer.length >= BUFFER_FLUSH_THRESHOLD) {
            flushBuffer();
          }
        }
      }
    } catch (err) {
      console.error(`[Message Error] Parsing issue on @${cleanHandle}:`, err);
    }
  });

  ws.on('close', () => {
    console.log(`[Disconnected] Stream closed for @${cleanHandle}`);
    if (connectionMeta.isClosing) {
      connectionPool.delete(cleanHandle);
      return;
    }
    scheduleReconnect(cleanHandle);
  });

  ws.on('error', (err) => {
    console.error(`[Socket Error] Issue on @${cleanHandle}:`, err.message);
    ws.terminate();
    // 'close' event will fire after 'error' and handle reconnection
  });
}

// ==========================================
// 3. TARGET POOL SYNCHRONIZER
// ==========================================
// Polls Supabase to discover new targets from profiles/manual inputs
async function syncTargets() {
  const { data: targets, error } = await supabase
    .from('tracked_targets')
    .select('unique_id');

  if (error) {
    console.error('[Sync Error] Failed to fetch tracked targets:', error.message);
    return;
  }

  if (targets) {
    for (const target of targets) {
      const handle = target.unique_id.toLowerCase().replace('@', '').trim();
      if (!connectionPool.has(handle)) {
        if (connectionPool.size >= MAX_CONNECTIONS) {
          console.warn(
            `[Sync] Connection pool at capacity (${MAX_CONNECTIONS}). Skipping @${handle}.`
          );
          continue;
        }
        startListening(handle);
      }
    }
  }
}

// ==========================================
// 4. GRACEFUL SHUTDOWN
// ==========================================
function shutdown(signal: string) {
  console.log(`\n[Shutdown] Received ${signal}. Closing all connections...`);

  for (const [handle, conn] of connectionPool.entries()) {
    conn.isClosing = true;
    if (conn.reconnectTimer) clearTimeout(conn.reconnectTimer);
    conn.socket.close(1000, 'Shutting down');
    console.log(`[Shutdown] Closed connection for @${handle}`);
  }
  connectionPool.clear();

  // Final flush of any remaining buffered transactions
  flushBuffer().finally(() => {
    console.log('[Shutdown] All connections closed. Exiting.');
    process.exit(0);
  });
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

// Initial boot & recurring polling loop
console.log(`[Boot] TokNomics WebSocket worker starting... (poll=${POLL_INTERVAL_MS / 1000}s, maxConnections=${MAX_CONNECTIONS})`);
syncTargets();
setInterval(syncTargets, POLL_INTERVAL_MS);
