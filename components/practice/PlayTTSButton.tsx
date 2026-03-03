"use client";

import { Button } from "@/components/ui/button";
import { Volume2, Loader2 } from "lucide-react";
import { usePlayTTS } from "@/hooks/use-play-tts";

interface PlayTTSButtonProps {
  text: string;
  speechRate?: number;
  voice?: string;
  onError?: (message: string | null) => void;
  disabled?: boolean;
  title?: string;
}

export function PlayTTSButton({
  text,
  speechRate = 0,
  voice = "cally",
  onError,
  disabled = false,
  title = "标准发音",
}: PlayTTSButtonProps) {
  const { play, loading } = usePlayTTS({ onError });

  return (
    <Button
      variant="outline"
      size="icon"
      onClick={() => play(text, { speechRate, voice })}
      disabled={!text?.trim() || loading || disabled}
      title={title}
    >
      {loading ? (
        <Loader2 className="size-4 animate-spin" />
      ) : (
        <Volume2 className="size-4" />
      )}
    </Button>
  );
}
