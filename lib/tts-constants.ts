/** 松口时间：静音持续多久视为说完（ms） */
export const VAD_SILENCE_TIMEOUT_OPTIONS: { value: number; label: string }[] = [
  { value: 1000, label: "1秒" },
  { value: 1500, label: "1.5秒" },
  { value: 1800, label: "1.8秒" },
  { value: 2400, label: "2.4秒" },
  { value: 3000, label: "3秒" },
];

export const TTS_SPEECH_RATE_OPTIONS: { value: number; label: string }[] = [
  { value: -500, label: "0.5x" },
  { value: 0, label: "1x" },
  { value: 166, label: "1.2x" },
  { value: 250, label: "1.5x" },
  { value: 500, label: "2x" },
];

export const TTS_VOICE_OPTIONS: { value: string; label: string }[] = [
  { value: "cally", label: "cally 美音女（口语）" },
  { value: "abby", label: "abby 美音女" },
  { value: "andy", label: "andy 美音男" },
  { value: "eric", label: "eric 英音男" },
  { value: "emily", label: "emily 英音女" },
  { value: "harry", label: "harry 英音男" },
  { value: "luna", label: "luna 英音女" },
  { value: "luca", label: "luca 英音男" },
  { value: "wendy", label: "wendy 英音女" },
  { value: "william", label: "william 英音男" },
];
