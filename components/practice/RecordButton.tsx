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
}

export function RecordButton({
  status,
  loading,
  onStart,
  onStop,
  disabled,
}: RecordButtonProps) {
  const isRecording = status === "recording";
  const isEvaluating = status === "stopped" && loading;

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
        停止录音
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
      disabled={disabled}
      className="w-full gap-2 sm:w-auto"
    >
      <Mic className="size-4" />
      开始录音
    </Button>
  );
}
