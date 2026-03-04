"use client";

import { Button } from "@/components/ui/button";
import { Mic, Square, Loader2 } from "lucide-react";
import type { RecordingStatus } from "@/stores/practice-store";

interface RecordButtonProps {
  status: RecordingStatus;
  loading: boolean;
  onStart: () => void;
  onStop: () => void;
  disabled?: boolean;
  /** 在 touchend/mousedown 时调用，用于 iOS 上在用户手势内解锁 AudioContext */
  onBeforeStart?: () => void;
}

export function RecordButton({
  status,
  loading,
  onStart,
  onStop,
  disabled,
  onBeforeStart,
}: RecordButtonProps) {
  const isWaiting = status === "waitingForSpeech";
  const isRecording = status === "recording";
  const isEvaluating = status === "stopped" && loading;

  if (isWaiting) {
    return (
      <Button
        variant="outline"
        size="lg"
        onClick={onStop}
        disabled={disabled}
        className="w-full gap-2 sm:w-auto animate-pulse"
      >
        <Mic className="size-4 text-orange-500" />
        请开始说话...
      </Button>
    );
  }

  if (isRecording) {
    return (
      <Button
        variant="destructive"
        size="lg"
        onClick={onStop}
        disabled={disabled}
        className="w-full gap-2 sm:w-auto"
      >
        <Square className="size-4 fill-current" />
        说话中（松口即停）
      </Button>
    );
  }

  if (isEvaluating) {
    return (
      <Button variant="outline" size="lg" disabled className="w-full gap-2 sm:w-auto">
        <Loader2 className="size-4 animate-spin" />
        评测中...
      </Button>
    );
  }

  return (
    <Button
      variant="default"
      size="lg"
      onClick={onStart}
      onMouseDown={onBeforeStart}
      onTouchEnd={onBeforeStart}
      disabled={disabled}
      className="w-full gap-2 sm:w-auto"
    >
      <Mic className="size-4" />
      开始录音
    </Button>
  );
}
