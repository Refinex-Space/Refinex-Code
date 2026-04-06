import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { VoiceDictationProgressPayload } from "../../../shared/contracts";

const DICTATION_SILENCE_TIMEOUT_MS = 1800;
const DICTATION_SIGNAL_THRESHOLD = 0.008;
const DICTATION_TARGET_SAMPLE_RATE = 16000;

type DictationStatus = "idle" | "preparing" | "listening" | "transcribing";

declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext;
  }
}

function appendTranscript(base: string, transcript: string) {
  const normalizedTranscript = transcript.trim();
  if (!normalizedTranscript) {
    return base;
  }

  if (!base.trim()) {
    return normalizedTranscript;
  }

  return /\s$/.test(base) ? `${base}${normalizedTranscript}` : `${base} ${normalizedTranscript}`;
}

function createAudioContext() {
  if (typeof window === "undefined") {
    return null;
  }

  const AudioContextConstructor = window.AudioContext ?? window.webkitAudioContext ?? null;
  if (!AudioContextConstructor) {
    return null;
  }

  return new AudioContextConstructor();
}

function hasAudioContextSupport() {
  if (typeof window === "undefined") {
    return false;
  }

  return Boolean(window.AudioContext ?? window.webkitAudioContext);
}

function concatFloat32(chunks: Float32Array[]) {
  const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const output = new Float32Array(totalLength);
  let offset = 0;

  for (const chunk of chunks) {
    output.set(chunk, offset);
    offset += chunk.length;
  }

  return output;
}

function resampleLinear(samples: Float32Array, fromRate: number, toRate: number) {
  if (fromRate === toRate) {
    return samples;
  }

  const ratio = fromRate / toRate;
  const outputLength = Math.max(1, Math.round(samples.length / ratio));
  const output = new Float32Array(outputLength);

  for (let index = 0; index < outputLength; index += 1) {
    const position = index * ratio;
    const leftIndex = Math.floor(position);
    const rightIndex = Math.min(leftIndex + 1, samples.length - 1);
    const weight = position - leftIndex;
    const left = samples[leftIndex] ?? 0;
    const right = samples[rightIndex] ?? left;
    output[index] = left + (right - left) * weight;
  }

  return output;
}

function computeRms(samples: Float32Array) {
  if (samples.length === 0) {
    return 0;
  }

  let sum = 0;
  for (let index = 0; index < samples.length; index += 1) {
    const sample = samples[index] ?? 0;
    sum += sample * sample;
  }

  return Math.sqrt(sum / samples.length);
}

export function useVoiceDictation({
  enabled,
  value,
  onChange,
  onUnsupported,
  onError,
}: {
  enabled: boolean;
  value: string;
  onChange: (value: string) => void;
  onUnsupported: () => void;
  onError: (message: string) => void;
}) {
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const processorNodeRef = useRef<ScriptProcessorNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const recordedChunksRef = useRef<Float32Array[]>([]);
  const silenceSinceRef = useRef<number | null>(null);
  const hasDetectedSpeechRef = useRef(false);
  const baseValueRef = useRef("");
  const statusRef = useRef<DictationStatus>("idle");
  const [status, setStatus] = useState<DictationStatus>("idle");
  const [progress, setProgress] = useState<VoiceDictationProgressPayload | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);

  const isSupported = useMemo(() => {
    return (
      typeof window !== "undefined" &&
      typeof navigator !== "undefined" &&
      Boolean(navigator.mediaDevices?.getUserMedia) &&
      Boolean(window.desktopApp?.prepareVoiceDictation) &&
      Boolean(window.desktopApp?.transcribeVoiceDictation) &&
      Boolean(window.desktopApp?.onVoiceDictationProgress) &&
      hasAudioContextSupport()
    );
  }, []);

  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  const cleanupCapture = useCallback(async () => {
    processorNodeRef.current?.disconnect();
    sourceNodeRef.current?.disconnect();
    gainNodeRef.current?.disconnect();
    processorNodeRef.current = null;
    sourceNodeRef.current = null;
    gainNodeRef.current = null;

    if (streamRef.current) {
      for (const track of streamRef.current.getTracks()) {
        track.stop();
      }
      streamRef.current = null;
    }

    if (audioContextRef.current) {
      await audioContextRef.current.close().catch(() => undefined);
      audioContextRef.current = null;
    }
  }, []);

  const finishRecording = useCallback(async () => {
    if (statusRef.current !== "listening") {
      return;
    }

    const sampleRate = audioContextRef.current?.sampleRate ?? DICTATION_TARGET_SAMPLE_RATE;
    const recordedAudio = concatFloat32(recordedChunksRef.current);
    recordedChunksRef.current = [];
    silenceSinceRef.current = null;
    hasDetectedSpeechRef.current = false;

    await cleanupCapture();

    if (recordedAudio.length === 0) {
      setStatus("idle");
      return;
    }

    setStatus("transcribing");

    try {
      const normalizedAudio = resampleLinear(
        recordedAudio,
        sampleRate,
        DICTATION_TARGET_SAMPLE_RATE,
      );
      const result = await window.desktopApp.transcribeVoiceDictation({
        samples: normalizedAudio,
        sampleRate: DICTATION_TARGET_SAMPLE_RATE,
      });
      onChange(appendTranscript(baseValueRef.current, result.text));
      setProgress(null);
      setLastError(null);
      setStatus("idle");
    } catch (error) {
      const message = error instanceof Error ? error.message : "语音转写失败。";
      setProgress({
        stage: "error",
        message,
        percent: null,
      });
      setLastError(message);
      setStatus("idle");
      onError(message);
    }
  }, [cleanupCapture, onChange, onError]);

  const stop = useCallback(() => {
    void finishRecording();
  }, [finishRecording]);

  const start = useCallback(async () => {
    if (!enabled) {
      return;
    }

    if (!isSupported) {
      onUnsupported();
      return;
    }

    if (status !== "idle") {
      return;
    }

    try {
      setStatus("preparing");
      setLastError(null);
      setProgress({
        stage: "checking",
        message: "正在检查本地语音模型",
        percent: null,
      });
      const availability = await window.desktopApp.prepareVoiceDictation();
      if (!availability.available) {
        setLastError(availability.message ?? "当前环境不支持语音听写。");
        setStatus("idle");
        onError(availability.message ?? "当前环境不支持语音听写。");
        return;
      }

      const audioContext = createAudioContext();
      if (!audioContext) {
        setStatus("idle");
        onUnsupported();
        return;
      }

      const mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      baseValueRef.current = value;
      recordedChunksRef.current = [];
      silenceSinceRef.current = null;
      hasDetectedSpeechRef.current = false;

      const sourceNode = audioContext.createMediaStreamSource(mediaStream);
      const processorNode = audioContext.createScriptProcessor(4096, 1, 1);
      const gainNode = audioContext.createGain();
      gainNode.gain.value = 0;

      processorNode.onaudioprocess = (event) => {
        if (statusRef.current !== "listening") {
          return;
        }

        const inputSamples = event.inputBuffer.getChannelData(0);
        const chunk = new Float32Array(inputSamples);
        recordedChunksRef.current.push(chunk);

        const rms = computeRms(chunk);
        if (rms >= DICTATION_SIGNAL_THRESHOLD) {
          hasDetectedSpeechRef.current = true;
          silenceSinceRef.current = null;
          return;
        }

        if (!hasDetectedSpeechRef.current) {
          return;
        }

        const now = Date.now();
        if (silenceSinceRef.current === null) {
          silenceSinceRef.current = now;
          return;
        }

        if (now - silenceSinceRef.current >= DICTATION_SILENCE_TIMEOUT_MS) {
          void finishRecording();
        }
      };

      sourceNode.connect(processorNode);
      processorNode.connect(gainNode);
      gainNode.connect(audioContext.destination);

      audioContextRef.current = audioContext;
      streamRef.current = mediaStream;
      sourceNodeRef.current = sourceNode;
      processorNodeRef.current = processorNode;
      gainNodeRef.current = gainNode;

      setStatus("listening");
    } catch (error) {
      await cleanupCapture();
      const message = error instanceof Error ? error.message : "语音输入不可用。";
      setProgress({
        stage: "error",
        message,
        percent: null,
      });
      setLastError(message);
      setStatus("idle");
      onError(message);
    }
  }, [cleanupCapture, enabled, finishRecording, isSupported, onError, onUnsupported, value]);

  const toggle = useCallback(() => {
    if (status === "listening") {
      stop();
      return;
    }

    if (status === "idle") {
      void start();
    }
  }, [start, status, stop]);

  useEffect(() => {
    if (!enabled && status === "listening") {
      stop();
    }
  }, [enabled, status, stop]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!enabled || event.defaultPrevented || event.repeat || event.isComposing) {
        return;
      }

      if (
        event.altKey &&
        !event.metaKey &&
        !event.ctrlKey &&
        !event.shiftKey &&
        event.code === "Space"
      ) {
        event.preventDefault();
        toggle();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [enabled, toggle]);

  useEffect(() => {
    if (!window.desktopApp?.onVoiceDictationProgress) {
      return;
    }

    return window.desktopApp.onVoiceDictationProgress((payload) => {
      setProgress(payload);
      if (payload.stage === "error") {
        setLastError(payload.message);
        setStatus("idle");
        return;
      }

      if (payload.stage === "ready") {
        setLastError(null);
      }
    });
  }, []);

  const retry = useCallback(() => {
    if (statusRef.current !== "idle") {
      return;
    }

    void start();
  }, [start]);

  const openModelsDirectory = useCallback(async () => {
    if (!window.desktopApp?.openVoiceDictationModelsDirectory) {
      return;
    }

    await window.desktopApp.openVoiceDictationModelsDirectory();
  }, []);

  useEffect(() => {
    return () => {
      void cleanupCapture();
    };
  }, [cleanupCapture]);

  return {
    isSupported,
    isListening: status === "listening",
    isPreparing: status === "preparing",
    isTranscribing: status === "transcribing",
    progress,
    lastError,
    retry,
    openModelsDirectory,
    toggle,
    stop,
  };
}
