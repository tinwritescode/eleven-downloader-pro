export const TURBO_PLAYBACK_RATE = 16.0;

const AUDIO_HOOKED = Symbol("elevenDownloaderPro.audioHooked");
const WS_HOOKED = Symbol("elevenDownloaderPro.wsHooked");

export interface AudioBufferSourceLike {
  playbackRate: { value: number };
  start: (...args: unknown[]) => unknown;
}

export interface AudioContextConstructorLike {
  prototype: {
    createBufferSource: (...args: unknown[]) => AudioBufferSourceLike;
    [AUDIO_HOOKED]?: boolean;
  };
}

export interface WebSocketLike {
  addEventListener: (
    type: "message",
    listener: (event: { readonly data: unknown }) => void,
  ) => void;
}

export interface WebSocketConstructorLike {
  new (url: string | URL, protocols?: string | string[]): WebSocketLike;
  [WS_HOOKED]?: boolean;
}

export interface HookableWindow {
  AudioContext?: AudioContextConstructorLike | undefined;
  webkitAudioContext?: AudioContextConstructorLike | undefined;
  WebSocket?: WebSocketConstructorLike | undefined;
}

function patchAudioContext(
  Ctor: AudioContextConstructorLike | undefined,
  shouldAccelerate: () => boolean,
): void {
  if (!Ctor?.prototype || Ctor.prototype[AUDIO_HOOKED]) return;

  const originalCreate = Ctor.prototype.createBufferSource;
  if (typeof originalCreate !== "function") return;

  Ctor.prototype.createBufferSource = function patchedCreateBufferSource(
    ...createArgs: unknown[]
  ): AudioBufferSourceLike {
    const source = originalCreate.apply(this, createArgs);
    const originalStart = source.start;

    source.start = function patchedStart(...startArgs: unknown[]): unknown {
      if (shouldAccelerate()) {
        try {
          source.playbackRate.value = TURBO_PLAYBACK_RATE;
        } catch {
          // Ignore locked or unsupported AudioParam mutations.
        }
      }
      return originalStart.apply(this, startArgs);
    };

    return source;
  };

  Ctor.prototype[AUDIO_HOOKED] = true;
}

export function installAudioHook(
  win: HookableWindow,
  shouldAccelerate: () => boolean,
): void {
  patchAudioContext(win.AudioContext, shouldAccelerate);
  if (win.webkitAudioContext && win.webkitAudioContext !== win.AudioContext) {
    patchAudioContext(win.webkitAudioContext, shouldAccelerate);
  }
}

export function installWebSocketHook(
  win: HookableWindow,
  onMessage: (data: unknown) => void,
): void {
  const OriginalWebSocket = win.WebSocket;
  if (!OriginalWebSocket || OriginalWebSocket[WS_HOOKED]) return;

  // Proxy preserves prototype, instanceof checks, static constants (OPEN, CLOSED, ...),
  // and exact constructor arity (avoiding passing an explicit `undefined` protocols argument).
  const proxied = new Proxy(OriginalWebSocket, {
    construct(target, args, newTarget) {
      const ws = Reflect.construct(target, args, newTarget) as WebSocketLike;
      ws.addEventListener("message", (event) => {
        onMessage(event.data);
      });
      return ws;
    },
    get(target, prop, receiver) {
      if (prop === WS_HOOKED) return true;
      return Reflect.get(target, prop, receiver);
    },
  });

  win.WebSocket = proxied;
}
