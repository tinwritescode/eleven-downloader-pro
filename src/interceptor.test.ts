import { describe, expect, it, vi } from "vitest";
import {
  TURBO_PLAYBACK_RATE,
  installAudioHook,
  installWebSocketHook,
  type AudioBufferSourceLike,
  type HookableWindow,
  type WebSocketLike,
} from "./interceptor";

describe("installAudioHook", () => {
  it("sets playbackRate to 16x only when shouldAccelerate returns true and is idempotent", () => {
    let accelerate = false;
    const startCalls: unknown[][] = [];

    class FakeAudioContext {
      createBufferSource(): AudioBufferSourceLike {
        return {
          playbackRate: { value: 1.0 },
          start(...args: unknown[]) {
            startCalls.push(args);
          },
        };
      }
    }

    const fakeWindow: HookableWindow = { AudioContext: FakeAudioContext };
    installAudioHook(fakeWindow, () => accelerate);
    installAudioHook(fakeWindow, () => accelerate); // idempotent

    const ctx = new FakeAudioContext();

    const s1 = ctx.createBufferSource();
    s1.start(0, 1);
    expect(s1.playbackRate.value).toBe(1.0);

    accelerate = true;
    const s2 = ctx.createBufferSource();
    s2.start(0, 2);
    expect(s2.playbackRate.value).toBe(TURBO_PLAYBACK_RATE);

    expect(startCalls).toEqual([
      [0, 1],
      [0, 2],
    ]);
  });
});

describe("installWebSocketHook", () => {
  it("preserves constructor arity, static constants, instanceof, and intercepts messages", () => {
    const received: unknown[] = [];
    const ctorArgs: unknown[][] = [];

    class FakeWebSocket implements WebSocketLike {
      static readonly CONNECTING = 0;
      static readonly OPEN = 1;
      static readonly CLOSING = 2;
      static readonly CLOSED = 3;

      private listeners: Array<(event: { readonly data: unknown }) => void> = [];

      constructor(...args: unknown[]) {
        ctorArgs.push(args);
      }

      addEventListener(
        _type: "message",
        listener: (event: { readonly data: unknown }) => void,
      ): void {
        this.listeners.push(listener);
      }

      emit(data: unknown): void {
        for (const listener of this.listeners) {
          listener({ data });
        }
      }
    }

    const fakeWindow: HookableWindow = {
      WebSocket: FakeWebSocket as unknown as HookableWindow["WebSocket"],
    };

    const onMessage = vi.fn((data: unknown) => received.push(data));
    installWebSocketHook(fakeWindow, onMessage);
    installWebSocketHook(fakeWindow, onMessage); // idempotent

    const HookedWS = fakeWindow.WebSocket as unknown as typeof FakeWebSocket;
    expect(HookedWS.OPEN).toBe(1);
    expect(HookedWS.CLOSED).toBe(3);

    const ws1 = new HookedWS("wss://api.elevenlabs.io/stream");
    const ws2 = new HookedWS("wss://api.elevenlabs.io/stream", ["proto-a"]);

    expect(ws1).toBeInstanceOf(FakeWebSocket);
    expect(ctorArgs).toEqual([
      ["wss://api.elevenlabs.io/stream"],
      ["wss://api.elevenlabs.io/stream", ["proto-a"]],
    ]);

    ws1.emit('{"audio":"AQID"}');
    ws2.emit('{"audio":"BAUG"}');

    expect(received).toEqual(['{"audio":"AQID"}', '{"audio":"BAUG"}']);
    expect(onMessage).toHaveBeenCalledTimes(2);
  });
});
