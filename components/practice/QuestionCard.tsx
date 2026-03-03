"use client";

import { PlayTTSButton } from "./PlayTTSButton";
import { TTSSpeechRateButtons } from "./TTSSpeechRateButtons";
import { VADSilenceTimeoutButtons } from "./VADSilenceTimeoutButtons";
import Image from "next/image";

interface QuestionCardProps {
  refText: string;
  speechRate: number;
  onSpeechRateChange: (value: number) => void;
  silenceTimeoutMs: number;
  onSilenceTimeoutChange: (value: number) => void;
  onTtsError?: (message: string | null) => void;
  imageUrl?: string | null;
}

export function QuestionCard({
  refText,
  speechRate,
  onSpeechRateChange,
  silenceTimeoutMs,
  onSilenceTimeoutChange,
  onTtsError,
  imageUrl,
}: QuestionCardProps) {
  return (
    <>
      <TTSSpeechRateButtons value={speechRate} onChange={onSpeechRateChange} />
      <VADSilenceTimeoutButtons
        value={silenceTimeoutMs}
        onChange={onSilenceTimeoutChange}
      />
      <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center">
        <div className="w-full flex-1 space-y-3 rounded-lg border bg-muted/30 p-4 sm:p-6">
          {imageUrl ? (
            <div className="relative aspect-video w-full max-w-md overflow-hidden rounded-md border">
              <Image
                src={imageUrl}
                alt={refText}
                fill
                className="object-contain"
                sizes="(max-width: 768px) 100vw, 28rem"
                unoptimized
              />
            </div>
          ) : null}
          <p className="text-lg leading-relaxed">{refText}</p>
        </div>
        <PlayTTSButton
          text={refText}
          speechRate={speechRate}
          onError={onTtsError}
        />
      </div>
    </>
  );
}
