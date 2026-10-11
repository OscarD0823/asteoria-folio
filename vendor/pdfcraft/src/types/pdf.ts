/**
 * PDF Processing Types
 * Requirements: 5.1, 5.5, 5.6
 */

/**
 * Error categories for PDF processing
 */
export enum ErrorCategory {
  FILE_ERROR = 'FILE_ERROR',
  PROCESSING_ERROR = 'PROCESSING_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR',
  BROWSER_ERROR = 'BROWSER_ERROR',
}

/**
 * Error codes for PDF processing
 */
export enum PDFErrorCode {
  // File errors
  FILE_TOO_LARGE = 'FILE_TOO_LARGE',
  FILE_TYPE_INVALID = 'FILE_TYPE_INVALID',
  FILE_CORRUPTED = 'FILE_CORRUPTED',
  FILE_EMPTY = 'FILE_EMPTY',
  FILE_NOT_PDF = 'FILE_NOT_PDF',

  // Processing errors
  PDF_ENCRYPTED = 'PDF_ENCRYPTED',
  PDF_MALFORMED = 'PDF_MALFORMED',
  PROCESSING_TIMEOUT = 'PROCESSING_TIMEOUT',
  PROCESSING_CANCELLED = 'PROCESSING_CANCELLED',
  PROCESSING_FAILED = 'PROCESSING_FAILED',
  INVALID_PASSWORD = 'INVALID_PASSWORD',

  // Browser errors
  MEMORY_EXCEEDED = 'MEMORY_EXCEEDED',
  WORKER_FAILED = 'WORKER_FAILED',
  BROWSER_NOT_SUPPORTED = 'BROWSER_NOT_SUPPORTED',

  // Validation errors
  INVALID_PAGE_RANGE = 'INVALID_PAGE_RANGE',
  INVALID_OPTIONS = 'INVALID_OPTIONS',

  // Unknown
  UNKNOWN = 'UNKNOWN',
}

/**
 * Map error codes to categories
 */
export const ERROR_CODE_CATEGORY: Record<PDFErrorCode, ErrorCategory> = {
  [PDFErrorCode.FILE_TOO_LARGE]: ErrorCategory.FILE_ERROR,
  [PDFErrorCode.FILE_TYPE_INVALID]: ErrorCategory.FILE_ERROR,
  [PDFErrorCode.FILE_CORRUPTED]: ErrorCategory.FILE_ERROR,
  [PDFErrorCode.FILE_EMPTY]: ErrorCategory.FILE_ERROR,
  [PDFErrorCode.FILE_NOT_PDF]: ErrorCategory.FILE_ERROR,
  [PDFErrorCode.PDF_ENCRYPTED]: ErrorCategory.PROCESSING_ERROR,
  [PDFErrorCode.PDF_MALFORMED]: ErrorCategory.PROCESSING_ERROR,
  [PDFErrorCode.PROCESSING_TIMEOUT]: ErrorCategory.PROCESSING_ERROR,
  [PDFErrorCode.PROCESSING_CANCELLED]: ErrorCategory.PROCESSING_ERROR,
  [PDFErrorCode.PROCESSING_FAILED]: ErrorCategory.PROCESSING_ERROR,
  [PDFErrorCode.INVALID_PASSWORD]: ErrorCategory.VALIDATION_ERROR,
  [PDFErrorCode.MEMORY_EXCEEDED]: ErrorCategory.BROWSER_ERROR,
  [PDFErrorCode.WORKER_FAILED]: ErrorCategory.BROWSER_ERROR,
  [PDFErrorCode.BROWSER_NOT_SUPPORTED]: ErrorCategory.BROWSER_ERROR,
  [PDFErrorCode.INVALID_PAGE_RANGE]: ErrorCategory.VALIDATION_ERROR,
  [PDFErrorCode.INVALID_OPTIONS]: ErrorCategory.VALIDATION_ERROR,
  [PDFErrorCode.UNKNOWN]: ErrorCategory.PROCESSING_ERROR,
};

/**
 * PDF processing error
 */
export interface PDFError {
  code: PDFErrorCode;
  category: ErrorCategory;
  message: string;
  details?: string;
  recoverable: boolean;
  suggestedAction?: string;
}

/**
 * Validation result for file validation
 */
export interface ValidationResult {
  valid: boolean;
  errors: PDFError[];
}

/**
 * Input for PDF processing
 */
export interface ProcessInput {
  files: File[];
  options: Record<string, unknown>;
}

/**
 * Output from PDF processing
 */
export interface ProcessOutput {
  success: boolean;
  result?: Blob | Blob[];
  filename?: string;
  error?: PDFError;
  metadata?: Record<string, unknown>;
}

/**
 * Progress callback type
 */
export type ProgressCallback = (progress: number, message?: string) => void;

/**
 * PDF Processor interface - base interface for all PDF processors
 * Requirements: 5.1
 */
export interface PDFProcessor {
  /** Process the input files */
  process(input: ProcessInput, onProgress?: ProgressCallback): Promise<ProcessOutput>;

  /** Validate input files before processing */
  validate(files: File[]): Promise<ValidationResult>;

  /** Get current processing progress (0-100) */
  getProgress(): number;

  /** Cancel ongoing processing */
  cancel(): void;
}

/**
 * Uploaded file with metadata
 */
export interface UploadedFile {
  id: string;
  file: File;
  preview?: string;
  status: 'pending' | 'processing' | 'complete' | 'error';
  error?: PDFError;
}

/**
 * Processing result
 */
export interface ProcessResult {
  blob: Blob;
  filename: string;
  size: number;
  metadata?: Record<string, unknown>;
}

/**
 * PDF document info
 */
export interface PDFDocumentInfo {
  pageCount: number;
  title?: string;
  author?: string;
  subject?: string;
  creator?: string;
  producer?: string;
  creationDate?: Date;
  modificationDate?: Date;
  isEncrypted: boolean;
  fileSize: number;
}

/**
 * Page range for split/extract operations
 */
export interface PageRange {
  start: number;
  end: number;
}

/**
 * Merge options
 */
export interface MergeOptions {
  preserveBookmarks: boolean;
  pageOrder: 'sequential' | 'interleaved';
}

/**
 * Split options
 */
export interface SplitOptions {
  ranges: PageRange[];
  outputFormat: 'single' | 'multiple';
}

/**
 * Compress options
 */
export interface CompressOptions {
  quality: 'low' | 'medium' | 'high';
  removeMetadata: boolean;
  optimizeImages: boolean;
}

/**
 * Default file size limits
 */
export const FILE_SIZE_LIMITS = {
  DEFAULT_MAX_SIZE: Infinity, // No limit
  LARGE_FILE_THRESHOLD: 50 * 1024 * 1024, // 50MB
  SMALL_FILE_THRESHOLD: 5 * 1024 * 1024, // 5MB
} as const;

/**
 * Supported file types
 */
export const SUPPORTED_FILE_TYPES = {
  PDF: ['application/pdf'],
  IMAGES: ['image/jpeg', 'image/png', 'image/webp', 'image/bmp', 'image/tiff', 'image/svg+xml'],
  TEXT: ['text/plain'],
  JSON: ['application/json'],
} as const;

/**
 * PDF magic bytes for validation
 */
export const PDF_MAGIC_BYTES = new Uint8Array([0x25, 0x50, 0x44, 0x46]); // %PDF
