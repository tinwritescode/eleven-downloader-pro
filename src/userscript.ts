import {
  installAudioHook,
  installWebSocketHook,
  type HookableWindow,
} from "./interceptor";
import { createRecorder } from "./recorder";
import { mountPanel } from "./ui";

const recorder = createRecorder();

// Hook AudioContext and WebSocket immediately at @early-start / document-start
// before the page's scripts cache references to them.
const targetWindow = window as unknown as HookableWindow;
installAudioHook(targetWindow, () => recorder.shouldAcceleratePlayback());
installWebSocketHook(targetWindow, (data) => {
  recorder.ingestMessage(data);
});

function mountWhenReady(): void {
  if (document.body) {
    mountPanel(recorder, { doc: document });
    return;
  }

  const onReady = (): void => {
    mountPanel(recorder, { doc: document });
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", onReady, { once: true });
  }
  window.addEventListener("load", onReady, { once: true });
}

mountWhenReady();
