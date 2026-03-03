"use client";

import { useState, useCallback } from "react";

interface UsePlayTTSOptions {
  onError?: (message: string | null) => void;
}

export function usePlayTTS(options: UsePlayTTSOptions = {}) {
  const { onError } = options;
  const [loading, setLoading] = useState(false);

  const play = useCallback(
    async (text: string, options?: { speechRate?: number; voice?: string }) => {
      const trimmed = text?.trim();
      if (!trimmed) {
        onError?.("评测文本不能为空");
        return;
      }
      onError?.(null);
      setLoading(true);
      try {
        const res = await fetch("/api/tts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text: trimmed,
            speech_rate: options?.speechRate ?? 0,
            voice: options?.voice ?? "cally",
          }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({ error: res.statusText }));
          throw new Error((err as { error?: string }).error ?? "TTS 请求失败");
        }
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        try {
          await audio.play();
          audio.onended = () => URL.revokeObjectURL(url);
        } catch (playErr) {
          URL.revokeObjectURL(url);
          throw playErr;
        }
      } catch (e) {
        onError?.(e instanceof Error ? e.message : "播放失败");
      } finally {
        setLoading(false);
      }
    },
    [onError]
  );

  return { play, loading };
}
