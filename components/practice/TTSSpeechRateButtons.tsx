"use client";

import { Button } from "@/components/ui/button";
import { TTS_SPEECH_RATE_OPTIONS } from "@/lib/tts-constants";

interface TTSSpeechRateButtonsProps {
  value: number;
  onChange: (value: number) => void;
}

export function TTSSpeechRateButtons({ value, onChange }: TTSSpeechRateButtonsProps) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-muted-foreground">语速</label>
      <div className="flex flex-wrap gap-2">
        {TTS_SPEECH_RATE_OPTIONS.map((opt) => (
          <Button
            key={opt.value}
            variant={value === opt.value ? "default" : "outline"}
            size="sm"
            onClick={() => onChange(opt.value)}
          >
            {opt.label}
          </Button>
        ))}
      </div>
    </div>
  );
}
