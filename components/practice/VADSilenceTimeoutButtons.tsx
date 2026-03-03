"use client";

import { Button } from "@/components/ui/button";
import { VAD_SILENCE_TIMEOUT_OPTIONS } from "@/lib/tts-constants";

interface VADSilenceTimeoutButtonsProps {
  value: number;
  onChange: (value: number) => void;
}

export function VADSilenceTimeoutButtons({
  value,
  onChange,
}: VADSilenceTimeoutButtonsProps) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-muted-foreground">松口时间</label>
      <div className="flex flex-wrap gap-2">
        {VAD_SILENCE_TIMEOUT_OPTIONS.map((opt) => (
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
