const { PDFDocument } = require('pdf-lib');

/**
 * Metadata stripper for PDF reports
 * Removes sensitive metadata before distribution
 */
class MetadataStripper {
  /**
   * Strip metadata from a PDF buffer
   * @param {Buffer} pdfBuffer - Input PDF
   * @returns {Promise<Buffer>} - Cleaned PDF
   */
  async stripPdfMetadata(pdfBuffer) {
    try {
      // Load the PDF
      const pdfDoc = await PDFDocument.load(pdfBuffer);

      // Remove all metadata fields
      pdfDoc.setTitle('');
      pdfDoc.setAuthor('');
      pdfDoc.setSubject('');
      pdfDoc.setCreator('');
      pdfDoc.setProducer('');
      pdfDoc.setKeywords([]);

      // Remove creation and modification dates
      pdfDoc.setCreationDate(new Date(0));
      pdfDoc.setModificationDate(new Date(0));

      // Save the cleaned PDF
      const cleanedPdfBytes = await pdfDoc.save();
      return Buffer.from(cleanedPdfBytes);
    } catch (error) {
      throw new Error(`Failed to strip PDF metadata: ${error.message}`);
    }
  }

  /**
   * Get metadata from a PDF (for verification)
   * @param {Buffer} pdfBuffer - Input PDF
   * @returns {Promise<Object>} - PDF metadata
   */
  async getPdfMetadata(pdfBuffer) {
    try {
      const pdfDoc = await PDFDocument.load(pdfBuffer);

      return {
        title: pdfDoc.getTitle(),
        author: pdfDoc.getAuthor(),
        subject: pdfDoc.getSubject(),
        creator: pdfDoc.getCreator(),
        producer: pdfDoc.getProducer(),
        keywords: pdfDoc.getKeywords(),
        creationDate: pdfDoc.getCreationDate(),
        modificationDate: pdfDoc.getModificationDate()
      };
    } catch (error) {
      throw new Error(`Failed to read PDF metadata: ${error.message}`);
    }
  }

  /**
   * Verify that metadata has been stripped
   * @param {Buffer} pdfBuffer - PDF to verify
   * @returns {Promise<boolean>} - True if metadata is clean
   */
  async verifyMetadataStripped(pdfBuffer) {
    try {
      const metadata = await this.getPdfMetadata(pdfBuffer);

      // Check that all sensitive fields are cleared
      return (
        !metadata.title &&
        !metadata.author &&
        !metadata.subject &&
        !metadata.creator &&
        metadata.keywords.length === 0
      );
    } catch (error) {
      console.error('Metadata verification failed:', error);
      return false;
    }
  }
}

module.exports = new MetadataStripper();
