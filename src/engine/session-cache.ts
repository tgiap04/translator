// Tai dung session la khac biet giua 300ms va 3s: Translator.create() nap model
// vao bo nho. Tao moi moi lan dich la tra lai toan bo chi phi khoi tao moi lan.
//
// NHUNG session giu RAM. Content script chay tren MOI frame cua MOI tab —
// khong gioi han la an RAM tuyen tinh theo so tab. Tran 3, LRU.
//
// Nhan `create` tu ngoai vao de test duoc khong can Chrome.

export type SessionLike = {
  translate(input: string, options?: { signal?: AbortSignal }): Promise<string>;
  translateStreaming?(input: string, options?: { signal?: AbortSignal }): ReadableStream<string>;
  destroy(): void;
};

export type CreateFn = (source: string, target: string, signal?: AbortSignal) => Promise<SessionLike>;

export const MAX_SESSIONS = 3;

/** BCP-47 khong chua dau '|', nen dung lam separator an toan. */
const keyOf = (s: string, t: string): string => `${s}|${t}`;

export function createSessionCache(create: CreateFn, max = MAX_SESSIONS) {
  // Map giu thu tu chen -> LRU tu nhien (xoa + chen lai khi truy cap).
  const live = new Map<string, SessionLike>();
  // Chong tao trung khi bam phim don dap cung mot cap.
  const pending = new Map<string, Promise<SessionLike>>();

  function evict(): void {
    while (live.size > max) {
      const oldest = live.keys().next();
      if (oldest.done) return;
      const victim = live.get(oldest.value);
      live.delete(oldest.value);
      try {
        victim?.destroy();
      } catch {
        // Session da chet — khong co gi de lam.
      }
    }
  }

  async function get(source: string, target: string, signal?: AbortSignal): Promise<SessionLike> {
    const key = keyOf(source, target);

    const hit = live.get(key);
    if (hit) {
      live.delete(key);
      live.set(key, hit); // cham vao -> day len cuoi
      return hit;
    }

    const inflight = pending.get(key);
    if (inflight) return inflight;

    const p = create(source, target, signal)
      .then((session) => {
        live.set(key, session);
        evict();
        return session;
      })
      .finally(() => {
        pending.delete(key);
      });

    pending.set(key, p);
    return p;
  }

  function destroyAll(): void {
    for (const s of live.values()) {
      try {
        s.destroy();
      } catch {
        // bo qua
      }
    }
    live.clear();
  }

  return {
    get,
    destroyAll,
    get size(): number {
      return live.size;
    },
  };
}
