"use client";

import { useCallback, useRef, useState } from "react";
import { usePracticeStore } from "@/stores/practice-store";

declare global {
  interface Window {
    EngineEvaluat: new (params: EngineEvaluatParams) => EngineEvaluatInstance;
  }
}

interface EngineEvaluatParams {
  applicationId: string;
  userId: string;
  engineFirstInitDone?: () => void;
  engineBackResultDone?: (msg: string) => void;
  engineBackResultFail?: (msg: string) => void;
  micAllowCallback?: () => void;
  micForbidCallback?: () => void;
  micVolumeCallback?: (data: number) => void;
  JSSDKNotSupport?: () => void;
  noNetwork?: () => void;
}

interface EngineEvaluatInstance {
  startRecord: (
    params: { coreType: string; refText: string; warrantId: string; evalTime?: number },
  ) => void;
  stopRecord: () => void;
  cancelRecord: () => void;
}

/** 音量判定阈值，SDK 回调值通常 0~100，需实测调校 */
const VAD_VOLUME_THRESHOLD = 8;
/** 静音持续多久视为说完（ms） */
const VAD_SILENCE_TIMEOUT = 1800;
/** 最短说话时长，防止噪音误触发（ms） */
const VAD_MIN_SPEECH_MS = 500;
/** 兜底超时（ms），防止录音无限进行 */
const VAD_MAX_RECORD_MS = 60_000;

function calcEvalTime(refText: string): number {
  const words = refText.trim().split(/\s+/).length;
  return 2000 + words * 600 + 1000;
}

/**
 * 封装阿里云语音评测 SDK：初始化、录音、停止。
 * 依赖 engine.js 已通过 Script 加载。
 */
type VadPhase = "idle" | "waitingForSpeech" | "speaking" | "silenceDetected";

export function useSpeechEval() {
  const engineRef = useRef<EngineEvaluatInstance | null>(null);
  const [isReady, setIsReady] = useState(false);
  const initPromiseRef = useRef<Promise<void> | null>(null);
  const vadStateRef = useRef<{
    phase: VadPhase;
    speechStartedAt: number | null;
    lastSpeechAt: number | null;
    silenceTimerId: ReturnType<typeof setTimeout> | null;
    maxRecordTimerId: ReturnType<typeof setTimeout> | null;
    silenceTimeoutMs: number;
  }>({
    phase: "idle",
    speechStartedAt: null,
    lastSpeechAt: null,
    silenceTimerId: null,
    maxRecordTimerId: null,
    silenceTimeoutMs: VAD_SILENCE_TIMEOUT,
  });
  const autoStopRef = useRef<() => void>(() => {});

  const {
    setRecordingStatus,
    setResult,
    setLoading,
    warrantId,
    setWarrantId,
  } = usePracticeStore();

  const autoStop = useCallback(() => {
    const vad = vadStateRef.current;
    if (vad.phase === "idle") return;

    if (vad.silenceTimerId) {
      clearTimeout(vad.silenceTimerId);
      vad.silenceTimerId = null;
    }
    if (vad.maxRecordTimerId) {
      clearTimeout(vad.maxRecordTimerId);
      vad.maxRecordTimerId = null;
    }
    vad.phase = "idle";
    vad.speechStartedAt = null;
    vad.lastSpeechAt = null;

    if (engineRef.current) {
      engineRef.current.stopRecord();
      setRecordingStatus("stopped");
      setLoading(true);
    }
  }, [setRecordingStatus, setLoading]);

  autoStopRef.current = autoStop;

  const resetEngine = useCallback(() => {
    initPromiseRef.current = null;
    engineRef.current = null;
    setIsReady(false);
    const vad = vadStateRef.current;
    if (vad.silenceTimerId) clearTimeout(vad.silenceTimerId);
    if (vad.maxRecordTimerId) clearTimeout(vad.maxRecordTimerId);
    vadStateRef.current = {
      phase: "idle",
      speechStartedAt: null,
      lastSpeechAt: null,
      silenceTimerId: null,
      maxRecordTimerId: null,
      silenceTimeoutMs: VAD_SILENCE_TIMEOUT,
    };
    setRecordingStatus("idle");
    setLoading(false);
  }, [setRecordingStatus, setLoading]);

  const ensureEngine = useCallback((): Promise<void> => {
    if (initPromiseRef.current) return initPromiseRef.current;

    const mainPromise = new Promise<void>((resolve, reject) => {
      const Engine = typeof window !== "undefined" ? window.EngineEvaluat : null;
      if (!Engine) {
        reject(new Error("EngineEvaluat not loaded. Ensure engine.js is loaded."));
        return;
      }

      const appId = process.env.NEXT_PUBLIC_ALIYUN_APP_ID;
      const userId = process.env.NEXT_PUBLIC_ALIYUN_USER_ID;
      if (!appId || !userId) {
        reject(new Error("Missing NEXT_PUBLIC_ALIYUN_APP_ID or NEXT_PUBLIC_ALIYUN_USER_ID"));
        return;
      }

      const instance = new Engine({
        applicationId: appId,
        userId,
        engineFirstInitDone: () => {
          setIsReady(true);
          resolve();
        },
        engineBackResultDone: (msg: string) => {
          const vad = vadStateRef.current;
          if (vad.silenceTimerId) clearTimeout(vad.silenceTimerId);
          if (vad.maxRecordTimerId) clearTimeout(vad.maxRecordTimerId);
          vad.phase = "idle";
          vad.speechStartedAt = null;
          vad.lastSpeechAt = null;
          vad.silenceTimerId = null;
          vad.maxRecordTimerId = null;

          try {
            setResult(JSON.parse(msg));
          } catch {
            setResult(null);
          }
          setLoading(false);
          setRecordingStatus("idle");
        },
        engineBackResultFail: (msg: string) => {
          const vad = vadStateRef.current;
          if (vad.silenceTimerId) clearTimeout(vad.silenceTimerId);
          if (vad.maxRecordTimerId) clearTimeout(vad.maxRecordTimerId);
          vad.phase = "idle";
          vad.speechStartedAt = null;
          vad.lastSpeechAt = null;
          vad.silenceTimerId = null;
          vad.maxRecordTimerId = null;

          console.error("[speech-eval] fail:", msg);
          setLoading(false);
          setRecordingStatus("idle");
        },
        micAllowCallback: () => {
          setIsReady(true);
          resolve();
        },
        micForbidCallback: () => {
          reject(new Error("麦克风权限被拒绝，请允许后重试"));
        },
        JSSDKNotSupport: () => {
          reject(new Error("Browser does not support speech evaluation"));
        },
        noNetwork: () => {
          reject(new Error("No network"));
        },
        micVolumeCallback: (volume: number) => {
          const vad = vadStateRef.current;
          const now = Date.now();

          if (vad.phase === "idle") return;

          const isSpeaking = volume > VAD_VOLUME_THRESHOLD;

          if (vad.phase === "waitingForSpeech" && isSpeaking) {
            vad.phase = "speaking";
            vad.speechStartedAt = now;
            vad.lastSpeechAt = now;
            setRecordingStatus("recording");
            return;
          }

          if (vad.phase === "speaking" || vad.phase === "silenceDetected") {
            if (isSpeaking) {
              vad.phase = "speaking";
              vad.lastSpeechAt = now;
              if (vad.silenceTimerId) {
                clearTimeout(vad.silenceTimerId);
                vad.silenceTimerId = null;
              }
            } else if (vad.phase === "speaking") {
              vad.phase = "silenceDetected";
              if (vad.silenceTimerId) clearTimeout(vad.silenceTimerId);
              vad.silenceTimerId = setTimeout(() => {
                const speechDuration =
                  (vad.lastSpeechAt ?? now) - (vad.speechStartedAt ?? now);
                if (speechDuration >= VAD_MIN_SPEECH_MS) {
                  autoStopRef.current();
                }
              }, vad.silenceTimeoutMs);
            }
          }
        },
      });

      engineRef.current = instance;
    });

    const timeoutPromise = new Promise<void>((_, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error("SDK 初始化超时，请重试"));
      }, 10000);
      mainPromise.finally(() => clearTimeout(timeoutId));
    });

    const promise = Promise.race([mainPromise, timeoutPromise]).catch((err) => {
      initPromiseRef.current = null;
      engineRef.current = null;
      setIsReady(false);
      throw err;
    });

    initPromiseRef.current = promise;
    return promise;
  }, [
    setRecordingStatus,
    setResult,
    setLoading,
  ]);

  const getWarrantId = useCallback(async (): Promise<string> => {
    if (warrantId) return warrantId;

    let clientIp: string | undefined;
    const ipServices = [
      "https://api.ipify.org?format=json",
      "https://ip.seeip.org/json",
    ];
    for (const url of ipServices) {
      try {
        const ipRes = await fetch(url);
        const ipData = (await ipRes.json()) as { ip?: string };
        if (ipData?.ip) {
          clientIp = ipData.ip;
          break;
        }
      } catch {
        // try next service or fallback to server-determined IP
      }
    }

    const res = await fetch("/api/warrant", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(clientIp ? { clientIp } : {}),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error((err as { error?: string })?.error ?? "Failed to get warrant");
    }
    const { warrantId: id } = (await res.json()) as { warrantId: string };
    setWarrantId(id);
    return id;
  }, [warrantId, setWarrantId]);

  const startEval = useCallback(
    async (
      refText: string,
      coreType: string,
      options?: { silenceTimeoutMs?: number },
    ) => {
      await ensureEngine();

      const vad = vadStateRef.current;
      if (vad.silenceTimerId) {
        clearTimeout(vad.silenceTimerId);
        vad.silenceTimerId = null;
      }
      if (vad.maxRecordTimerId) {
        clearTimeout(vad.maxRecordTimerId);
        vad.maxRecordTimerId = null;
      }

      const wId = await getWarrantId();
      const silenceTimeoutMs =
        options?.silenceTimeoutMs ?? vad.silenceTimeoutMs ?? VAD_SILENCE_TIMEOUT;

      vadStateRef.current = {
        phase: "waitingForSpeech",
        speechStartedAt: null,
        lastSpeechAt: null,
        silenceTimerId: null,
        silenceTimeoutMs,
        maxRecordTimerId: setTimeout(() => {
          autoStopRef.current();
        }, VAD_MAX_RECORD_MS),
      };

      engineRef.current?.startRecord({
        coreType,
        refText,
        warrantId: wId,
        evalTime: VAD_MAX_RECORD_MS,
      });

      setRecordingStatus("waitingForSpeech");
      setLoading(false);
    },
    [ensureEngine, getWarrantId, setRecordingStatus, setLoading],
  );

  const stopEval = useCallback(() => {
    const vad = vadStateRef.current;
    if (vad.silenceTimerId) {
      clearTimeout(vad.silenceTimerId);
      vad.silenceTimerId = null;
    }
    if (vad.maxRecordTimerId) {
      clearTimeout(vad.maxRecordTimerId);
      vad.maxRecordTimerId = null;
    }
    vad.phase = "idle";
    vad.speechStartedAt = null;
    vad.lastSpeechAt = null;

    if (engineRef.current) {
      engineRef.current.stopRecord();
      setRecordingStatus("stopped");
      setLoading(true);
    }
  }, [setRecordingStatus, setLoading]);

  const cancelEval = useCallback(() => {
    const vad = vadStateRef.current;
    if (vad.silenceTimerId) {
      clearTimeout(vad.silenceTimerId);
      vad.silenceTimerId = null;
    }
    if (vad.maxRecordTimerId) {
      clearTimeout(vad.maxRecordTimerId);
      vad.maxRecordTimerId = null;
    }
    vad.phase = "idle";
    vad.speechStartedAt = null;
    vad.lastSpeechAt = null;

    engineRef.current?.cancelRecord();
    setRecordingStatus("idle");
    setLoading(false);
  }, [setRecordingStatus, setLoading]);

  return {
    isReady,
    startEval,
    stopEval,
    cancelEval,
    ensureEngine,
    resetEngine,
  };
}
