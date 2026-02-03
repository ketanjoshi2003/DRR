const fs = require('fs').promises;
const pdfParse = require('pdf-parse');
const Tesseract = require('tesseract.js');
const path = require('path');
const { PDFDocument } = require('pdf-lib');

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

        // Use modern pdf-lib for metadata (much more reliable)
        let metadata = {};
        let numPages = 0;
        try {
            const pdfDoc = await PDFDocument.load(dataBuffer, {
                updateMetadata: false,
                ignoreEncryption: true
            });
            metadata = {
                title: pdfDoc.getTitle() || null,
                author: pdfDoc.getAuthor() || null,
                subject: pdfDoc.getSubject() || null,
                creator: pdfDoc.getCreator() || null,
                producer: pdfDoc.getProducer() || null,
                creationDate: pdfDoc.getCreationDate() || null,
                modificationDate: pdfDoc.getModificationDate() || null,
                keywords: pdfDoc.getKeywords() || null,
            };
            numPages = pdfDoc.getPageCount();
        } catch (libError) {
            console.warn('pdf-lib failed to parse metadata, falling back to pdf-parse:', libError.message);
        }

        // Use pdf-parse for text content
        const pdfData = await pdfParse(dataBuffer);

        return {
            metadata: {
                title: metadata.title || pdfData.info?.Title || null,
                author: metadata.author || pdfData.info?.Author || null,
                subject: metadata.subject || pdfData.info?.Subject || null,
                creator: metadata.creator || pdfData.info?.Creator || null,
                producer: metadata.producer || pdfData.info?.Producer || null,
                creationDate: metadata.creationDate || pdfData.info?.CreationDate || null,
                modificationDate: metadata.modificationDate || pdfData.info?.ModDate || null,
                keywords: metadata.keywords || pdfData.info?.Keywords || null,
            },
            content: {
                text: pdfData.text || '',
                numPages: numPages || pdfData.numpages || 0,
                version: pdfData.version,
            },
            searchableText: (pdfData.text || '').trim().length > 0
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
async function performOCR(filePath, maxPages = 5, language = 'eng') {
    try {
        // Tesseract language mapping
        const langMap = {
            'english': 'eng',
            'hindi': 'hin',
            'marathi': 'mar'
        };
        const tesseractLang = langMap[language] || 'eng';

        // Note: This is a simplified OCR implementation
        // For production, you might want to convert PDF pages to images first
        const { data: { text } } = await Tesseract.recognize(
            filePath,
            tesseractLang,
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
        ocrMaxPages = 5,
        language = 'english'
    } = options;

    try {
        // Step 1: Extract basic metadata and text
        const pdfInfo = await extractPDFMetadata(filePath);

        // Step 2: Determine if OCR is needed
        const needsOCR = performOCRIfNeeded && !pdfInfo.searchableText;

        let ocrResult = null;
        if (needsOCR) {
            console.log(`PDF appears to be scanned. Performing OCR in ${language}...`);
            ocrResult = await performOCR(filePath, ocrMaxPages, language);
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
