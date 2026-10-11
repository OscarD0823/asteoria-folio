/**
 * Alternate Merge PDF Processor
 * Requirements: 5.1
 * 
 * Implements PDF alternate/interleave merging functionality using pdf-lib.
 * Combines two or more PDFs by interleaving their pages alternately.
 * Perfect for combining separately scanned front and back pages.
 */

import type {
  ProcessInput,
  ProcessOutput,
  ProgressCallback,
} from '@/types/pdf';
import { PDFErrorCode } from '@/types/pdf';
import { BasePDFProcessor } from '../processor';
import { loadPdfLib } from '../loader';

/**
 * Options for alternate merge
 */
export interface AlternateMergeOptions {
  /** Whether to reverse the second document (for back-to-front scans) */
  reverseSecond: boolean;
  /** Whether to preserve bookmarks from source documents */
  preserveBookmarks: boolean;
}

/**
 * Default alternate merge options
 */
const DEFAULT_ALTERNATE_MERGE_OPTIONS: AlternateMergeOptions = {
  reverseSecond: false,
  preserveBookmarks: false,
};

/**
 * Alternate Merge PDF Processor
 * Merges multiple PDF files by interleaving their pages alternately.
 */
export class AlternateMergePDFProcessor extends BasePDFProcessor {
  /**
   * Process multiple PDF files and merge them by interleaving pages
   */
  async process(
    input: ProcessInput,
    onProgress?: ProgressCallback
  ): Promise<ProcessOutput> {
    this.reset();
    this.onProgress = onProgress;

    const { files, options } = input;
    const mergeOptions: AlternateMergeOptions = {
      ...DEFAULT_ALTERNATE_MERGE_OPTIONS,
      ...(options as Partial<AlternateMergeOptions>),
    };

    // Validate we have at least 2 files
    if (files.length < 2) {
      return this.createErrorOutput(
        PDFErrorCode.INVALID_OPTIONS,
        'At least 2 PDF files are required for alternate merging.',
        `Received ${files.length} file(s).`
      );
    }

    try {
      this.updateProgress(5, 'Loading PDF library...');

      // Load pdf-lib
      const pdfLib = await loadPdfLib();

      if (this.checkCancelled()) {
        return this.createErrorOutput(
          PDFErrorCode.PROCESSING_CANCELLED,
          'Processing was cancelled.'
        );
      }

      this.updateProgress(10, 'Loading PDF documents...');

      // Load all PDF documents and get their page counts
      const loadedPdfs: Array<{
        doc: Awaited<ReturnType<typeof pdfLib.PDFDocument.load>>;
        pageCount: number;
        name: string;
      }> = [];

      const progressPerFile = 30 / files.length;

      for (let i = 0; i < files.length; i++) {
        if (this.checkCancelled()) {
          return this.createErrorOutput(
            PDFErrorCode.PROCESSING_CANCELLED,
            'Processing was cancelled.'
          );
        }

        const file = files[i];
        const fileProgress = 10 + (i * progressPerFile);

        this.updateProgress(
          fileProgress,
          `Loading file ${i + 1} of ${files.length}: ${file.name}`
        );

        try {
          const arrayBuffer = await file.arrayBuffer();
          const pdfDoc = await pdfLib.PDFDocument.load(arrayBuffer, {
            ignoreEncryption: false,
          });

          const pageCount = pdfDoc.getPageCount();
          loadedPdfs.push({
            doc: pdfDoc,
            pageCount,
            name: file.name,
          });
        } catch (error) {
          if (error instanceof Error && error.message.includes('encrypt')) {
            return this.createErrorOutput(
              PDFErrorCode.PDF_ENCRYPTED,
              `File "${file.name}" is encrypted.`,
              'Please decrypt the file before merging.'
            );
          }

          return this.createErrorOutput(
            PDFErrorCode.PROCESSING_FAILED,
            `Failed to load file "${file.name}".`,
            error instanceof Error ? error.message : 'Unknown error'
          );
        }
      }

      this.updateProgress(40, 'Creating merged document...');

      // Create a new PDF document for the merged result
      const mergedPdf = await pdfLib.PDFDocument.create();

      // Get the maximum page count across all documents
      const maxPages = Math.max(...loadedPdfs.map(p => p.pageCount));

      // If reverseSecond is enabled and we have at least 2 documents,
      // we need to reverse the page order of the second document
      const pageIndicesPerDoc: number[][] = loadedPdfs.map((pdf, index) => {
        const indices = Array.from({ length: pdf.pageCount }, (_, i) => i);
        // Reverse second document if option is enabled
        if (index === 1 && mergeOptions.reverseSecond) {
          return indices.reverse();
        }
        return indices;
      });

      this.updateProgress(50, 'Interleaving pages...');

      // Interleave pages from all documents
      const progressPerPage = 40 / maxPages;
      let totalPagesCopied = 0;

      for (let pageIndex = 0; pageIndex < maxPages; pageIndex++) {
        if (this.checkCancelled()) {
          return this.createErrorOutput(
            PDFErrorCode.PROCESSING_CANCELLED,
            'Processing was cancelled.'
          );
        }

        const pageProgress = 50 + (pageIndex * progressPerPage);
        this.updateProgress(pageProgress, `Processing page ${pageIndex + 1} of ${maxPages}...`);

        // For each document, copy the page at this index if it exists
        for (let docIndex = 0; docIndex < loadedPdfs.length; docIndex++) {
          const pdf = loadedPdfs[docIndex];
          const actualPageIndex = pageIndicesPerDoc[docIndex][pageIndex];

          // Only copy if this document has a page at this index
          if (actualPageIndex !== undefined && actualPageIndex < pdf.pageCount) {
            try {
              const [copiedPage] = await mergedPdf.copyPages(pdf.doc, [actualPageIndex]);
              mergedPdf.addPage(copiedPage);
              totalPagesCopied++;
            } catch (error) {
              return this.createErrorOutput(
                PDFErrorCode.PROCESSING_FAILED,
                `Failed to copy page ${actualPageIndex + 1} from "${pdf.name}".`,
                error instanceof Error ? error.message : 'Unknown error'
              );
            }
          }
        }
      }

      this.updateProgress(95, 'Saving merged PDF...');

      // Save the merged PDF
      const mergedPdfBytes = await mergedPdf.save({ useObjectStreams: true });
      const blob = new Blob([new Uint8Array(mergedPdfBytes)], { type: 'application/pdf' });

      this.updateProgress(100, 'Complete!');

      // Generate output filename
      const outputFilename = generateAlternateMergedFilename(files);

      return this.createSuccessOutput(blob, outputFilename, {
        pageCount: totalPagesCopied,
        fileCount: files.length,
        interleaved: true,
      });

    } catch (error) {
      return this.createErrorOutput(
        PDFErrorCode.PROCESSING_FAILED,
        'Failed to alternate merge PDF files.',
        error instanceof Error ? error.message : 'Unknown error'
      );
    }
  }

  /**
   * Get maximum file size for alternate merge processor
   */
  protected getMaxFileSize(): number {
    return 500 * 1024 * 1024; // 500MB
  }

  /**
   * Get accepted file types for alternate merge processor
   */
  protected getAcceptedTypes(): string[] {
    return ['application/pdf'];
  }
}

/**
 * Get filename without extension
 */
function getFileNameWithoutExtension(filename: string): string {
  const lastDot = filename.lastIndexOf('.');
  if (lastDot === -1) return filename;
  return filename.slice(0, lastDot);
}

/**
 * Generate a filename for the alternate merged PDF
 */
function generateAlternateMergedFilename(files: File[]): string {
  if (files.length === 0) return 'alternate-merged.pdf';

  const firstName = getFileNameWithoutExtension(files[0].name);

  if (files.length === 2) {
    const secondName = getFileNameWithoutExtension(files[1].name);
    return `${firstName}_${secondName}_interleaved.pdf`;
  }

  return `${firstName}_and_${files.length - 1}_more_interleaved.pdf`;
}

/**
 * Create a new instance of the alternate merge processor
 */
export function createAlternateMergeProcessor(): AlternateMergePDFProcessor {
  return new AlternateMergePDFProcessor();
}

/**
 * Alternate merge multiple PDF files (convenience function)
 */
export async function alternateMergePDFs(
  files: File[],
  options?: Partial<AlternateMergeOptions>,
  onProgress?: ProgressCallback
): Promise<ProcessOutput> {
  const processor = createAlternateMergeProcessor();
  return processor.process(
    {
      files,
      options: options || {},
    },
    onProgress
  );
}
