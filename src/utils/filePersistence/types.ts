export type TurnStartTime = number

export type PersistedFile = {
  filename: string
  file_id: string
}

export type FailedPersistence = {
  filename: string
  error: string
}

export type FilesPersistedEventData = {
  files: PersistedFile[]
  failed: FailedPersistence[]
}

// 与 filesApi 默认并发保持一致，避免文件持久化层再引入一套不同默认值。
export const DEFAULT_UPLOAD_CONCURRENCY = 5

export const FILE_COUNT_LIMIT = 100

export const OUTPUTS_SUBDIR = 'outputs'
