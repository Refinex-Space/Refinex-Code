import { existsSync } from "node:fs";
import { mkdir, rename, rm, stat, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { createRequire } from "node:module";
import { arch, platform } from "node:os";
import { spawn } from "node:child_process";
import type {
  VoiceDictationAvailability,
  VoiceDictationProgressPayload,
  VoiceDictationTranscriptionInput,
  VoiceDictationTranscriptionResult,
} from "../shared/contracts";

const require = createRequire(import.meta.url);

const VOICE_MODEL_ID = "sherpa-onnx-paraformer-zh-small-2024-03-09";
const VOICE_MODEL_LABEL = "Paraformer ZH Small";
const VOICE_MODEL_ARCHIVE_URL =
  "https://github.com/k2-fsa/sherpa-onnx/releases/download/asr-models/sherpa-onnx-paraformer-zh-small-2024-03-09.tar.bz2";
const TARGET_SAMPLE_RATE = 16_000;
const TARGET_FEATURE_DIM = 80;

type SherpaOnnxModule = typeof import("sherpa-onnx-node");
type OfflineRecognizerInstance = InstanceType<
  SherpaOnnxModule["OfflineRecognizer"]
>;

interface VoiceModelPaths {
  rootDir: string;
  modelPath: string;
  tokensPath: string;
}

type VoiceProgressReporter = (payload: VoiceDictationProgressPayload) => void;

let recognizerPromise: Promise<OfflineRecognizerInstance> | null = null;
let modelPathsPromise: Promise<VoiceModelPaths> | null = null;

function getModelsRoot(userDataPath: string) {
  return join(userDataPath, "voice-dictation-models");
}

export function getVoiceDictationModelsRoot(userDataPath: string) {
  return getModelsRoot(userDataPath);
}

function getDownloadedModelDir(userDataPath: string) {
  return join(getModelsRoot(userDataPath), VOICE_MODEL_ID);
}

function buildModelPaths(rootDir: string): VoiceModelPaths {
  return {
    rootDir,
    modelPath: join(rootDir, "model.int8.onnx"),
    tokensPath: join(rootDir, "tokens.txt"),
  };
}

function hasModelFiles(paths: VoiceModelPaths) {
  return existsSync(paths.modelPath) && existsSync(paths.tokensPath);
}

async function ensureDirectory(pathname: string) {
  await mkdir(pathname, { recursive: true });
}

function reportProgress(
  reporter: VoiceProgressReporter | undefined,
  payload: VoiceDictationProgressPayload,
) {
  reporter?.(payload);
}

async function streamDownload(
  url: string,
  targetPath: string,
  onProgress?: VoiceProgressReporter,
) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`下载离线语音模型失败：HTTP ${response.status}`);
  }

  await ensureDirectory(dirname(targetPath));
  const totalHeader = response.headers.get("content-length");
  const bytesTotal = totalHeader ? Number.parseInt(totalHeader, 10) : null;
  if (!response.body) {
    throw new Error("下载离线语音模型失败：未收到响应数据。");
  }

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let bytesReceived = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }

    if (!value) {
      continue;
    }

    chunks.push(value);
    bytesReceived += value.byteLength;
    reportProgress(onProgress, {
      stage: "downloading",
      message: "正在下载离线语音模型",
      percent:
        bytesTotal && bytesTotal > 0
          ? Math.min(100, (bytesReceived / bytesTotal) * 100)
          : null,
      bytesReceived,
      bytesTotal,
    });
  }

  const archiveBuffer = Buffer.concat(
    chunks.map((chunk) => Buffer.from(chunk)),
  );
  await writeFile(targetPath, archiveBuffer);
}

async function extractArchive(
  archivePath: string,
  outputDir: string,
  onProgress?: VoiceProgressReporter,
) {
  reportProgress(onProgress, {
    stage: "extracting",
    message: "正在解压离线语音模型",
    percent: null,
  });
  await new Promise<void>((resolve, reject) => {
    const child = spawn("tar", ["-xjf", archivePath, "-C", outputDir], {
      stdio: "ignore",
    });

    child.once("error", reject);
    child.once("close", (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(
        new Error(`解压离线语音模型失败，tar 退出码：${code ?? "unknown"}`),
      );
    });
  });
}

async function ensureModelPaths(
  userDataPath: string,
  onProgress?: VoiceProgressReporter,
): Promise<VoiceModelPaths> {
  if (!modelPathsPromise) {
    modelPathsPromise = (async () => {
      const modelsRoot = getModelsRoot(userDataPath);
      const modelDir = getDownloadedModelDir(userDataPath);
      const modelPaths = buildModelPaths(modelDir);
      reportProgress(onProgress, {
        stage: "checking",
        message: "正在检查本地语音模型",
        percent: null,
      });
      if (hasModelFiles(modelPaths)) {
        return modelPaths;
      }

      await ensureDirectory(modelsRoot);
      const archivePath = join(modelsRoot, `${VOICE_MODEL_ID}.tar.bz2`);
      const extractingDir = join(modelsRoot, `${VOICE_MODEL_ID}.extracting`);
      await rm(extractingDir, { recursive: true, force: true });
      await ensureDirectory(extractingDir);

      try {
        await streamDownload(VOICE_MODEL_ARCHIVE_URL, archivePath, onProgress);
        await extractArchive(archivePath, extractingDir, onProgress);

        const extractedModelDir = join(extractingDir, VOICE_MODEL_ID);
        const extractedPaths = buildModelPaths(extractedModelDir);
        if (!hasModelFiles(extractedPaths)) {
          throw new Error(
            "离线语音模型下载完成，但未找到 model.int8.onnx 或 tokens.txt。",
          );
        }

        await rm(modelDir, { recursive: true, force: true });
        await rename(extractedModelDir, modelDir);
        return buildModelPaths(modelDir);
      } finally {
        await rm(extractingDir, { recursive: true, force: true }).catch(
          () => undefined,
        );
        await rm(archivePath, { force: true }).catch(() => undefined);
      }
    })();
  }

  try {
    return await modelPathsPromise;
  } catch (error) {
    modelPathsPromise = null;
    throw error;
  }
}

function getSherpaRuntimeDir() {
  if (platform() !== "darwin") {
    return null;
  }

  const optionalPackageName =
    arch() === "arm64" ? "sherpa-onnx-darwin-arm64" : "sherpa-onnx-darwin-x64";

  try {
    const packageJsonPath = require.resolve(
      `${optionalPackageName}/package.json`,
    );
    return dirname(packageJsonPath);
  } catch {
    return null;
  }
}

function ensureSherpaRuntimeEnv() {
  const runtimeDir = getSherpaRuntimeDir();
  if (!runtimeDir) {
    return;
  }

  const key = platform() === "darwin" ? "DYLD_LIBRARY_PATH" : "LD_LIBRARY_PATH";
  const current = process.env[key] ?? "";
  if (current.split(":").includes(runtimeDir)) {
    return;
  }

  process.env[key] = current ? `${runtimeDir}:${current}` : runtimeDir;
}

async function loadSherpaRecognizer(userDataPath: string) {
  ensureSherpaRuntimeEnv();
  const sherpa = require("sherpa-onnx-node") as SherpaOnnxModule;
  const modelPaths = await ensureModelPaths(userDataPath);

  return sherpa.OfflineRecognizer.createAsync({
    featConfig: {
      sampleRate: TARGET_SAMPLE_RATE,
      featureDim: TARGET_FEATURE_DIM,
    },
    modelConfig: {
      paraformer: {
        model: modelPaths.modelPath,
      },
      tokens: modelPaths.tokensPath,
      numThreads: 2,
      provider: "cpu",
    },
  });
}

async function getRecognizer(userDataPath: string) {
  if (!recognizerPromise) {
    recognizerPromise = loadSherpaRecognizer(userDataPath);
  }

  try {
    return await recognizerPromise;
  } catch (error) {
    recognizerPromise = null;
    throw error;
  }
}

function sanitizeTranscript(text: string) {
  return text.replace(/\s+/g, " ").trim();
}

function resampleLinear(
  samples: Float32Array,
  fromRate: number,
  toRate: number,
) {
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

export async function prepareVoiceDictation(
  userDataPath: string,
  onProgress?: VoiceProgressReporter,
): Promise<VoiceDictationAvailability> {
  if (platform() !== "darwin") {
    return {
      available: false,
      provider: "sherpa-onnx",
      modelId: VOICE_MODEL_ID,
      modelLabel: VOICE_MODEL_LABEL,
      downloaded: false,
      message: "当前仅支持 macOS 本地离线语音输入。",
    };
  }

  const modelPaths = await ensureModelPaths(userDataPath, onProgress);
  reportProgress(onProgress, {
    stage: "loading",
    message: "正在加载离线语音模型",
    percent: null,
  });
  await getRecognizer(userDataPath);
  reportProgress(onProgress, {
    stage: "ready",
    message: "离线语音模型已就绪",
    percent: 100,
  });
  return {
    available: true,
    provider: "sherpa-onnx",
    modelId: VOICE_MODEL_ID,
    modelLabel: VOICE_MODEL_LABEL,
    downloaded: hasModelFiles(modelPaths),
    message: null,
  };
}

export async function transcribeVoiceDictation(
  userDataPath: string,
  input: VoiceDictationTranscriptionInput,
  onProgress?: VoiceProgressReporter,
): Promise<VoiceDictationTranscriptionResult> {
  reportProgress(onProgress, {
    stage: "transcribing",
    message: "正在转写录音",
    percent: null,
  });
  const recognizer = await getRecognizer(userDataPath);
  const startedAt = Date.now();
  const normalizedSamples = resampleLinear(
    input.samples,
    input.sampleRate,
    TARGET_SAMPLE_RATE,
  );
  const stream = recognizer.createStream();
  stream.acceptWaveform({
    samples: normalizedSamples,
    sampleRate: TARGET_SAMPLE_RATE,
  });
  const result = await recognizer.decodeAsync(stream);
  const text = sanitizeTranscript(result.text ?? "");

  return {
    text,
    modelLabel: VOICE_MODEL_LABEL,
    sampleRate: TARGET_SAMPLE_RATE,
    sampleCount: normalizedSamples.length,
    durationMs: Date.now() - startedAt,
  };
}

export async function getVoiceModelStats(userDataPath: string) {
  const paths = buildModelPaths(getDownloadedModelDir(userDataPath));
  if (!hasModelFiles(paths)) {
    return null;
  }

  const modelStat = await stat(paths.modelPath);
  return {
    modelBytes: modelStat.size,
  };
}
