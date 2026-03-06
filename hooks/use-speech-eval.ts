"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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
/** 最短说话时长，防止噪音误触发（ms），默认值，可被 options.minSpeechMs 覆盖 */
const VAD_MIN_SPEECH_MS = 200;
/** 兜底超时（ms），防止录音无限进行 */
const VAD_MAX_RECORD_MS = 60_000;
/** 引擎复用冷却期（ms），给 SDK 内部清理时间 */
const ENGINE_COOLDOWN_MS = 500;

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
    minSpeechMs: number;
  }>({
    phase: "idle",
    speechStartedAt: null,
    lastSpeechAt: null,
    silenceTimerId: null,
    maxRecordTimerId: null,
    silenceTimeoutMs: VAD_SILENCE_TIMEOUT,
    minSpeechMs: VAD_MIN_SPEECH_MS,
  });
  const autoStopRef = useRef<() => void>(() => {});
  const lastDebugUpdateRef = useRef(0);
  const lastEvalEndRef = useRef(0);
  const [debugInfo, setDebugInfo] = useState<{
    volume: number;
    phase: string;
    isSpeaking: boolean;
    lastEvent: string;
  } | null>(null);

  const {
    recordingStatus,
    setRecordingStatus,
    setResult,
    setLoading,
    warrantId,
    setWarrantId,
  } = usePracticeStore();

  const autoStop = useCallback(() => {
    const vad = vadStateRef.current;
    if (vad.phase === "idle") return;

    const now = Date.now();
    const dur = (vad.lastSpeechAt ?? now) - (vad.speechStartedAt ?? now);
    setDebugInfo((prev) => ({
      ...(prev ?? { volume: 0, phase: "idle", isSpeaking: false, lastEvent: "" }),
      lastEvent: `autoStop: dur=${dur}ms`,
    }));

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
      try {
        engineRef.current.stopRecord();
      } catch {
        /* 麦克风可能已被收回 */
      }
      setRecordingStatus("stopped");
      setLoading(true);
    }
  }, [setRecordingStatus, setLoading]);

  autoStopRef.current = autoStop;

  const resetEngine = useCallback(() => {
    lastEvalEndRef.current = 0;
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
      minSpeechMs: VAD_MIN_SPEECH_MS,
    };
    setRecordingStatus("idle");
    setLoading(false);
  }, [setRecordingStatus, setLoading]);

  useEffect(() => {
    if (recordingStatus === "idle") {
      const t = setTimeout(() => setDebugInfo(null), 3000);
      return () => clearTimeout(t);
    }
  }, [recordingStatus]);

  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.visibilityState === "hidden" && engineRef.current) {
        try {
          engineRef.current.cancelRecord();
        } catch {
          /* 麦克风可能已被用户手动收回 */
        }
        lastEvalEndRef.current = 0;
        initPromiseRef.current = null;
        engineRef.current = null;
        const vad = vadStateRef.current;
        if (vad.silenceTimerId) clearTimeout(vad.silenceTimerId);
        if (vad.maxRecordTimerId) clearTimeout(vad.maxRecordTimerId);
        vad.phase = "idle";
        vad.speechStartedAt = null;
        vad.lastSpeechAt = null;
        vad.silenceTimerId = null;
        vad.maxRecordTimerId = null;
        setRecordingStatus("idle");
        setLoading(false);
      }
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => document.removeEventListener("visibilitychange", onVisibilityChange);
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
          lastEvalEndRef.current = Date.now();
          const vad = vadStateRef.current;
          if (vad.silenceTimerId) clearTimeout(vad.silenceTimerId);
          if (vad.maxRecordTimerId) clearTimeout(vad.maxRecordTimerId);
          vad.phase = "idle";
          vad.speechStartedAt = null;
          vad.lastSpeechAt = null;
          vad.silenceTimerId = null;
          vad.maxRecordTimerId = null;

          let overall = "?";
          try {
            const parsed = JSON.parse(msg) as { result?: { overall?: number } };
            overall = String(parsed?.result?.overall ?? "?");
            setResult(parsed);
          } catch {
            setResult(null);
          }
          setDebugInfo((prev) => ({
            ...(prev ?? { volume: 0, phase: "idle", isSpeaking: false, lastEvent: "" }),
            lastEvent: `resultDone: overall=${overall}`,
          }));
          setLoading(false);
          setRecordingStatus("idle");
        },
        engineBackResultFail: (msg: string) => {
          lastEvalEndRef.current = Date.now();
          const vad = vadStateRef.current;
          if (vad.silenceTimerId) clearTimeout(vad.silenceTimerId);
          if (vad.maxRecordTimerId) clearTimeout(vad.maxRecordTimerId);
          vad.phase = "idle";
          vad.speechStartedAt = null;
          vad.lastSpeechAt = null;
          vad.silenceTimerId = null;
          vad.maxRecordTimerId = null;

          const msgPreview = String(msg).slice(0, 30);
          setDebugInfo((prev) => ({
            ...(prev ?? { volume: 0, phase: "idle", isSpeaking: false, lastEvent: "" }),
            lastEvent: `resultFail: ${msgPreview}`,
          }));
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

          if (now - lastDebugUpdateRef.current >= 200) {
            lastDebugUpdateRef.current = now;
            setDebugInfo((prev) => ({
              ...(prev ?? { volume: 0, phase: "idle", isSpeaking: false, lastEvent: "" }),
              volume,
              phase: vad.phase,
              isSpeaking,
            }));
          }

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
                const minMs = vad.minSpeechMs ?? VAD_MIN_SPEECH_MS;
                if (speechDuration >= minMs) {
                  autoStopRef.current();
                } else {
                  vad.silenceTimerId = null;
                  vad.phase = "waitingForSpeech";
                  vad.speechStartedAt = null;
                  vad.lastSpeechAt = null;
                  setDebugInfo((prev) => ({
                    ...(prev ?? { volume: 0, phase: "idle", isSpeaking: false, lastEvent: "" }),
                    lastEvent: `tooShort: dur=${speechDuration}ms < min${minMs}ms, reset`,
                  }));
                  setRecordingStatus("waitingForSpeech");
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
      options?: { silenceTimeoutMs?: number; minSpeechMs?: number },
    ) => {
      if (recordingStatus !== "idle") return;

      const v = vadStateRef.current;
      if (v.phase !== "idle") return;

      if (v.silenceTimerId) {
        clearTimeout(v.silenceTimerId);
        v.silenceTimerId = null;
      }
      if (v.maxRecordTimerId) {
        clearTimeout(v.maxRecordTimerId);
        v.maxRecordTimerId = null;
      }

      setRecordingStatus("waitingForSpeech");
      setLoading(false);

      const silenceTimeoutMs =
        options?.silenceTimeoutMs ?? v.silenceTimeoutMs ?? VAD_SILENCE_TIMEOUT;
      const minSpeechMs =
        options?.minSpeechMs ?? v.minSpeechMs ?? VAD_MIN_SPEECH_MS;

      try {
        await ensureEngine();
      } catch (e) {
        setRecordingStatus("idle");
        throw e;
      }

      const wId = await getWarrantId();

      const isReuse = lastEvalEndRef.current > 0;
      const elapsed = Date.now() - lastEvalEndRef.current;
      if (isReuse && elapsed < ENGINE_COOLDOWN_MS) {
        const waitMs = ENGINE_COOLDOWN_MS - elapsed;
        await new Promise((r) => setTimeout(r, waitMs));
        setDebugInfo((prev) => ({
          ...(prev ?? { volume: 0, phase: "idle", isSpeaking: false, lastEvent: "" }),
          lastEvent: `cooldown: waited ${waitMs}ms`,
        }));
      }

      v.phase = "waitingForSpeech";
      v.speechStartedAt = null;
      v.lastSpeechAt = null;
      v.silenceTimerId = null;
      v.silenceTimeoutMs = silenceTimeoutMs;
      v.minSpeechMs = minSpeechMs;
      v.maxRecordTimerId = setTimeout(() => {
        autoStopRef.current();
      }, VAD_MAX_RECORD_MS);

      try {
        engineRef.current?.startRecord({
          coreType,
          refText,
          warrantId: wId,
          evalTime: VAD_MAX_RECORD_MS,
        });
        setDebugInfo((prev) => ({
          ...(prev ?? { volume: 0, phase: "idle", isSpeaking: false, lastEvent: "" }),
          lastEvent: `startRecord: reuse=${isReuse}`,
        }));
      } catch (e) {
        if (v.maxRecordTimerId) {
          clearTimeout(v.maxRecordTimerId);
          v.maxRecordTimerId = null;
        }
        v.phase = "idle";
        v.speechStartedAt = null;
        v.lastSpeechAt = null;

        initPromiseRef.current = null;
        engineRef.current = null;
        if (
          e instanceof Error &&
          /MediaStream|createMediaStreamSource/i.test(e.message)
        ) {
          setDebugInfo((prev) => ({
            ...(prev ?? { volume: 0, phase: "idle", isSpeaking: false, lastEvent: "" }),
            lastEvent: "startRecord-retry",
          }));
          try {
            await ensureEngine();
            const retryEngine = engineRef.current as EngineEvaluatInstance | null;
            retryEngine?.startRecord({
              coreType,
              refText,
              warrantId: wId,
              evalTime: VAD_MAX_RECORD_MS,
            });
            v.phase = "waitingForSpeech";
            v.silenceTimeoutMs = silenceTimeoutMs;
            v.minSpeechMs = minSpeechMs;
            v.maxRecordTimerId = setTimeout(() => {
              autoStopRef.current();
            }, VAD_MAX_RECORD_MS);
          } catch (retryErr) {
            setRecordingStatus("idle");
            throw retryErr;
          }
        } else {
          setRecordingStatus("idle");
          throw e;
        }
      }
    },
    [
      recordingStatus,
      ensureEngine,
      getWarrantId,
      setRecordingStatus,
      setLoading,
    ],
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
      try {
        engineRef.current.stopRecord();
      } catch {
        /* 麦克风可能已被收回 */
      }
      setRecordingStatus("stopped");
      setLoading(true);
    } else {
      setRecordingStatus("idle");
      setLoading(false);
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
    lastEvalEndRef.current = 0;
    initPromiseRef.current = null;
    engineRef.current = null;
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
    debugInfo,
    getWarrantId,
  };
}
