declare module "sherpa-onnx-node" {
  export interface OfflineRecognizerConfig {
    featConfig?: {
      sampleRate?: number;
      featureDim?: number;
    };
    modelConfig?: {
      paraformer?: {
        model?: string;
      };
      tokens?: string;
      numThreads?: number;
      provider?: string;
    };
  }

  export interface OfflineRecognizerResult {
    text: string;
  }

  export interface OfflineStream {
    acceptWaveform(input: {
      samples: Float32Array;
      sampleRate: number;
    }): void;
  }

  export class OfflineRecognizer {
    static createAsync(config: OfflineRecognizerConfig): Promise<OfflineRecognizer>;
    createStream(): OfflineStream;
    decodeAsync(stream: OfflineStream): Promise<OfflineRecognizerResult>;
  }
}
