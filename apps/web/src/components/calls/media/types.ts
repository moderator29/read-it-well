import type { JoinCredentials } from "@/lib/calls/types";

/**
 * The media session's shapes, with no SDK import, so the call stage can hold
 * them while `livekit-client` itself stays behind `import("./session")`.
 */
export type MediaSnapshot = {
  connection: "idle" | "connecting" | "connected" | "reconnecting" | "disconnected";
  /** Set when the room closed for a reason the screen should act on. */
  disconnectReason: "server" | "duplicate" | "network" | "local" | null;
  remotePresent: boolean;
  remoteVideoOn: boolean;
  remoteMicMuted: boolean;
  micOn: boolean;
  cameraOn: boolean;
  /** Rear camera in use (no mirror on the self view). */
  rear: boolean;
  quality: 0 | 1 | 2 | 3;
  canSwitchCamera: boolean;
  outputs: { id: string; label: string }[];
  outputId: string | null;
};

export const EMPTY_MEDIA: MediaSnapshot = {
  connection: "idle",
  disconnectReason: null,
  remotePresent: false,
  remoteVideoOn: false,
  remoteMicMuted: false,
  micOn: false,
  cameraOn: false,
  rear: false,
  quality: 0,
  canSwitchCamera: false,
  outputs: [],
  outputId: null,
};

export type CallMedia = {
  connect(credentials: JoinCredentials): Promise<void>;
  setMic(on: boolean): Promise<void>;
  setCamera(on: boolean): Promise<void>;
  switchCamera(): Promise<void>;
  nextOutput(): Promise<void>;
  attachRemoteVideo(el: HTMLVideoElement | null): void;
  attachLocalVideo(el: HTMLVideoElement | null): void;
  close(): Promise<void>;
};
