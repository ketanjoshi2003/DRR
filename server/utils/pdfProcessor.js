const fs = require('fs').promises;
const pdfParse = require('pdf-parse');
const Tesseract = require('tesseract.js');
const path = require('path');

/**
 * PDF Processing Utility
 * Handles metadata extraction and OCR for uploaded PDFs
 */

/**
 * Extract metadata and text content from PDF
 * @param {string} filePath - Path to the PDF file
 * @returns {Promise<Object>} Extracted metadata and content
 */
async function extractPDFMetadata(filePath) {
    try {
        const dataBuffer = await fs.readFile(filePath);
        const pdfData = await pdfParse(dataBuffer);

        return {
            metadata: {
                title: pdfData.info?.Title || null,
                author: pdfData.info?.Author || null,
                subject: pdfData.info?.Subject || null,
                creator: pdfData.info?.Creator || null,
                producer: pdfData.info?.Producer || null,
                creationDate: pdfData.info?.CreationDate || null,
                modificationDate: pdfData.info?.ModDate || null,
                keywords: pdfData.info?.Keywords || null,
            },
            content: {
                text: pdfData.text,
                numPages: pdfData.numpages,
                version: pdfData.version,
            },
            searchableText: pdfData.text.trim().length > 0
        };
    } catch (error) {
        console.error('Error extracting PDF metadata:', error);
        throw new Error('Failed to extract PDF metadata');
    }
}

/**
 * Perform OCR on a PDF file (for scanned PDFs)
 * @param {string} filePath - Path to the PDF file
 * @param {number} maxPages - Maximum pages to process (default: 5)
 * @returns {Promise<Object>} OCR results
 */
async function performOCR(filePath, maxPages = 5) {
    try {
        // Note: This is a simplified OCR implementation
        // For production, you might want to convert PDF pages to images first
        const { data: { text } } = await Tesseract.recognize(
            filePath,
            'eng',
            {
                logger: m => console.log(`OCR Progress: ${Math.round(m.progress * 100)}%`)
            }
        );

        return {
            ocrText: text,
            success: true,
            pagesProcessed: 1 // Simplified - in production, process multiple pages
        };
    } catch (error) {
        console.error('Error performing OCR:', error);
        return {
            ocrText: '',
            success: false,
            error: error.message
        };
    }
}

/**
 * Process uploaded PDF - extract metadata and perform OCR if needed
 * @param {string} filePath - Path to the PDF file
 * @param {Object} options - Processing options
 * @returns {Promise<Object>} Complete PDF processing results
 */
async function processUploadedPDF(filePath, options = {}) {
    const {
        performOCRIfNeeded = true,
        ocrMaxPages = 5
    } = options;

    try {
        // Step 1: Extract basic metadata and text
        const pdfInfo = await extractPDFMetadata(filePath);

        // Step 2: Determine if OCR is needed
        const needsOCR = performOCRIfNeeded && !pdfInfo.searchableText;

        let ocrResult = null;
        if (needsOCR) {
            console.log('PDF appears to be scanned. Performing OCR...');
            ocrResult = await performOCR(filePath, ocrMaxPages);
        }

        return {
            metadata: pdfInfo.metadata,
            content: pdfInfo.content,
            ocr: ocrResult,
            isSearchable: pdfInfo.searchableText || (ocrResult?.success || false),
            fullTextContent: pdfInfo.content.text || ocrResult?.ocrText || '',
            processed: true
        };
    } catch (error) {
        console.error('Error processing PDF:', error);
        throw error;
    }
}

/**
 * Generate auto-title from PDF content if title is missing
 * @param {Object} processedData - Processed PDF data
 * @param {string} originalFilename - Original file name
 * @returns {string} Generated or extracted title
 */
function generateTitle(processedData, originalFilename) {
    // Priority 1: Use PDF metadata title
    if (processedData.metadata.title) {
        return processedData.metadata.title;
    }

    // Priority 2: Use first line of text content
    if (processedData.fullTextContent) {
        const firstLine = processedData.fullTextContent
            .split('\n')[0]
            .trim()
            .substring(0, 100); // Limit to 100 chars

        if (firstLine.length > 5) {
            return firstLine;
        }
    }

    // Priority 3: Use cleaned filename
    return originalFilename
        .replace(/\.pdf$/i, '')
        .replace(/[-_]/g, ' ')
        .trim();
}

/**
 * Process multiple PDFs in bulk
 * @param {Array<string>} filePaths - Array of file paths
 * @param {Object} options - Processing options
 * @returns {Promise<Array>} Results for all files
 */
async function processBulkPDFs(filePaths, options = {}) {
    const results = [];

    for (const filePath of filePaths) {
        try {
            const result = await processUploadedPDF(filePath, options);
            results.push({
                filePath,
                success: true,
                data: result
            });
        } catch (error) {
            results.push({
                filePath,
                success: false,
                error: error.message
            });
        }
    }

    return results;
}

module.exports = {
    extractPDFMetadata,
    performOCR,
    processUploadedPDF,
    generateTitle,
    processBulkPDFs
};
