/**
 * GiftStream — Background WebSocket Ingestion Worker
 *
 * File: worker/index.ts
 *
 * Standalone Node.js/TypeScript service that:
 * 1. Polls the `tracked_targets` table every 60 seconds.
 * 2. Opens a WebSocket connection to Euler Stream for each target.
 * 3. Listens for WebcastGiftMessage events, extracts gift metadata.
 * 4. Buffers transactions and batch-inserts into `gift_transactions`.
 * 5. Handles reconnection with exponential backoff on socket failure.
 *
 * Run: tsx worker/index.ts  (or compiled: node dist/worker/index.js)
 */

import WebSocket from "ws";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../src/types/database";

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------
const EULER_WS_URL = "wss://ws.eulerstream.com";
const EULER_API_KEY = process.env.EULER_API_KEY;
const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const POLL_INTERVAL_MS = (parseInt(process.env.WORKER_POLL_INTERVAL_SECONDS ?? "60", 10)) * 1000;
const MAX_CONNECTIONS = parseInt(process.env.WORKER_MAX_CONNECTIONS ?? "100", 10);
const BUFFER_FLUSH_MS = 1500;
const BUFFER_MAX_ITEMS = 20;
const MAX_BACKOFF_MS = 30_000;
const BASE_BACKOFF_MS = 1_000;

if (!EULER_API_KEY) {
  console.error("[Worker] FATAL: EULER_API_KEY is not set");
  process.exit(1);
}
if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error("[Worker] FATAL: Supabase URL or service role key is not set");
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Supabase client (service role — bypasses RLS)
// ---------------------------------------------------------------------------
const supabase: SupabaseClient<Database> = createClient<Database>(
  SUPABASE_URL,
  SUPABASE_SERVICE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } },
);

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface TrackedTargetRow {
  id: string;
  unique_id: string;
  is_registered_user: boolean;
  is_live: boolean;
}

interface GiftBufferItem {
  room_id: string | null;
  sender_user_id: string;
  sender_unique_id: string;
  sender_avatar: string | null;
  receiver_unique_id: string;
  gift_id: string;
  gift_name: string;
  repeat_count: number;
  diamond_cost: number;
}

interface EulerGiftMessage {
  type?: string;
  event?: string;
  data?: {
    // Sender metadata
    userId?: string;
    uniqueId?: string;
    nickName?: string;
    profilePictureUrl?: string;
    // Gift metadata
    giftId?: string | number;
    giftName?: string;
    diamondCount?: number;
    repeatCount?: number;
    // Room metadata
    roomId?: string | number;
    // Receiver (the streamer being watched)
    receiver_unique_id?: string;
  };
}

// ---------------------------------------------------------------------------
// Connection Manager
// ---------------------------------------------------------------------------
const connections = new Map<string, WebSocket>();
const reconnectAttempts = new Map<string, number>();
let giftBuffer: GiftBufferItem[] = [];
let bufferFlushTimer: ReturnType<typeof setTimeout> | null = null;

/**
 * Open a WebSocket connection to Euler Stream for a given uniqueId.
 */
function openConnection(uniqueId: string): void {
  if (connections.has(uniqueId)) return;
  if (connections.size >= MAX_CONNECTIONS) {
    console.warn(`[Worker] Max connections (${MAX_CONNECTIONS}) reached — skipping @${uniqueId}`);
    return;
  }

  const url = `${EULER_WS_URL}?uniqueId=${encodeURIComponent(uniqueId)}&apiKey=${encodeURIComponent(EULER_API_KEY)}`;
  console.log(`[Worker] Opening connection for @${uniqueId}`);

  let socket: WebSocket;
  try {
    socket = new WebSocket(url);
  } catch (err) {
    console.error(`[Worker] Failed to create socket for @${uniqueId}:`, err);
    scheduleReconnect(uniqueId);
    return;
  }

  connections.set(uniqueId, socket);

  socket.on("open", () => {
    console.log(`[Worker] Connected to @${uniqueId}`);
    reconnectAttempts.set(uniqueId, 0);
  });

  socket.on("message", (rawData: WebSocket.RawData) => {
    try {
      const parsed = JSON.parse(rawData.toString());

      // Euler Stream sends arrays of messages under `data.messages` or top-level `messages`
      const messages: EulerGiftMessage[] = parsed?.messages ?? parsed?.data?.messages ?? [];

      for (const msg of messages) {
        if (msg.type !== "WebcastGiftMessage" && msg.event !== "gift") {
          continue;
        }

        const gift = extractGift(msg, uniqueId);
        if (gift) {
          addToBuffer(gift);
        }
      }

      // Handle single-message payloads (no messages array)
      if (messages.length === 0) {
        if (parsed?.type === "WebcastGiftMessage" || parsed?.event === "gift") {
          const gift = extractGift(parsed as EulerGiftMessage, uniqueId);
          if (gift) addToBuffer(gift);
        }
      }
    } catch (err) {
      console.error(`[Worker] Message parse error for @${uniqueId}:`, err);
    }
  });

  socket.on("close", (code: number, reason: Buffer) => {
    console.warn(`[Worker] Socket closed for @${uniqueId} (code=${code}): ${reason.toString()}`);
    connections.delete(uniqueId);
    scheduleReconnect(uniqueId);
  });

  socket.on("error", (err: Error) => {
    console.error(`[Worker] Socket error for @${uniqueId}:`, err.message);
    // close handler will fire and handle reconnection
  });
}

/**
 * Extract gift transaction data from an Euler Stream gift message.
 */
function extractGift(msg: EulerGiftMessage, targetUniqueId: string): GiftBufferItem | null {
  const d = msg.data ?? (msg as unknown as { data?: Record<string, unknown> }).data;
  const data = (d ?? {}) as NonNullable<EulerGiftMessage["data"]>;

  const senderUserId = String(data.userId ?? "unknown");
  const senderUniqueId = (data.uniqueId ?? "unknown").toString().toLowerCase().replace(/^@+/, "");
  const senderAvatar = data.profilePictureUrl ?? null;
  // The receiver is the streamer being watched (the target unique_id)
  const receiverUniqueId = (data.receiver_unique_id ?? targetUniqueId).toString().toLowerCase().replace(/^@+/, "");
  const giftId = String(data.giftId ?? "unknown");
  const giftName = data.giftName ?? "Unknown Gift";
  const diamondCount = data.diamondCount ?? 0;
  const repeatCount = data.repeatCount ?? 1;
  const diamondCost = (diamondCount || 0) * (repeatCount || 1);
  const roomId = data.roomId != null ? String(data.roomId) : null;

  if (senderUniqueId === "unknown" || receiverUniqueId === "unknown") {
    return null;
  }

  return {
    room_id: roomId,
    sender_user_id: senderUserId,
    sender_unique_id: senderUniqueId,
    sender_avatar: senderAvatar,
    receiver_unique_id: receiverUniqueId,
    gift_id: giftId,
    gift_name: giftName,
    repeat_count: repeatCount,
    diamond_cost: diamondCost,
  };
}

/**
 * Add a gift transaction to the buffer and flush if needed.
 */
function addToBuffer(item: GiftBufferItem): void {
  giftBuffer.push(item);

  // Flush immediately if buffer exceeds threshold
  if (giftBuffer.length >= BUFFER_MAX_ITEMS) {
    flushBuffer();
    return;
  }

  // Schedule a timed flush if not already pending
  if (!bufferFlushTimer) {
    bufferFlushTimer = setTimeout(flushBuffer, BUFFER_FLUSH_MS);
  }
}

/**
 * Batch insert buffered gift transactions into Supabase.
 */
async function flushBuffer(): Promise<void> {
  if (bufferFlushTimer) {
    clearTimeout(bufferFlushTimer);
    bufferFlushTimer = null;
  }

  if (giftBuffer.length === 0) return;

  const batch = [...giftBuffer];
  giftBuffer = [];

  console.log(`[Worker] Flushing ${batch.length} gift transaction(s) to Supabase`);

  const { error } = await supabase.from("gift_transactions").insert(batch);

  if (error) {
    console.error(`[Worker] Batch insert failed (${batch.length} items):`, error.message);
    // Re-buffer failed items for a retry (with cap to avoid infinite growth)
    giftBuffer = [...batch, ...giftBuffer].slice(0, 200);
    // Schedule a retry flush
    if (!bufferFlushTimer) {
      bufferFlushTimer = setTimeout(flushBuffer, BUFFER_FLUSH_MS * 2);
    }
  } else {
    console.log(`[Worker] Successfully inserted ${batch.length} gift transaction(s)`);
  }
}

/**
 * Schedule a reconnection attempt with exponential backoff.
 */
function scheduleReconnect(uniqueId: string): void {
  const attempts = (reconnectAttempts.get(uniqueId) ?? 0) + 1;
  reconnectAttempts.set(uniqueId, attempts);

  const backoff = Math.min(BASE_BACKOFF_MS * Math.pow(2, attempts - 1), MAX_BACKOFF_MS);
  const jitter = Math.random() * 500;
  const delay = backoff + jitter;

  console.log(`[Worker] Reconnecting to @${uniqueId} in ${Math.round(delay)}ms (attempt ${attempts})`);

  setTimeout(() => {
    // Only reconnect if still in tracked_targets (will be verified on next poll)
    openConnection(uniqueId);
  }, delay);
}

/**
 * Poll the tracked_targets table and sync WebSocket connections.
 */
async function pollTargets(): Promise<void> {
  try {
    const { data, error } = await supabase
      .from("tracked_targets")
      .select("id, unique_id, is_registered_user, is_live");

    if (error) {
      console.error("[Worker] Failed to poll tracked_targets:", error.message);
      return;
    }

    const targets = (data ?? []) as unknown as TrackedTargetRow[];
    const activeHandles = new Set<string>();

    // Update last_checked_at for all targets
    await supabase
      .from("tracked_targets")
      .update({ last_checked_at: new Date().toISOString() })
      .in(
        "id",
        targets.map((t) => t.id),
      );

    for (const target of targets) {
      activeHandles.add(target.unique_id);

      if (!connections.has(target.unique_id)) {
        openConnection(target.unique_id);
      }
    }

    // Close connections for targets no longer in the table
    for (const [handle, socket] of connections) {
      if (!activeHandles.has(handle)) {
        console.log(`[Worker] Closing stale connection for @${handle}`);
        socket.removeAllListeners();
        socket.close();
        connections.delete(handle);
        reconnectAttempts.delete(handle);
      }
    }

    console.log(
      `[Worker] Poll complete: ${targets.length} targets, ${connections.size} active connections`,
    );
  } catch (err) {
    console.error("[Worker] Poll error:", err);
  }
}

// ---------------------------------------------------------------------------
// Graceful shutdown
// ---------------------------------------------------------------------------
function shutdown(signal: string): void {
  console.log(`[Worker] Received ${signal} — shutting down gracefully`);

  // Flush any remaining buffered gifts
  flushBuffer().then(() => {
    // Close all WebSocket connections
    for (const [handle, socket] of connections) {
      socket.removeAllListeners();
      socket.close();
      console.log(`[Worker] Closed connection for @${handle}`);
    }
    connections.clear();
    process.exit(0);
  });

  // Force exit after 10 seconds
  setTimeout(() => {
    console.error("[Worker] Forced shutdown after timeout");
    process.exit(1);
  }, 10_000);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main(): Promise<void> {
  console.log("[Worker] GiftStream ingestion worker starting…");
  console.log(`[Worker] Poll interval: ${POLL_INTERVAL_MS}ms`);
  console.log(`[Worker] Max connections: ${MAX_CONNECTIONS}`);

  // Initial poll
  await pollTargets();

  // Schedule periodic polling
  setInterval(pollTargets, POLL_INTERVAL_MS);

  // Graceful shutdown handlers
  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("unhandledRejection", (err) => {
    console.error("[Worker] Unhandled rejection:", err);
  });
}

main().catch((err) => {
  console.error("[Worker] Fatal startup error:", err);
  process.exit(1);
});

export {};
