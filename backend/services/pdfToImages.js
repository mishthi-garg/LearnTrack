// services/pdfToImages.js
const { getDocument } = require("pdfjs-dist/legacy/build/pdf.mjs");
const { createCanvas } = require("@napi-rs/canvas");

async function getPdfPageCount(fileBuffer) {
  const loadingTask = getDocument({ data: new Uint8Array(fileBuffer) });
  const pdfDoc = await loadingTask.promise;
  const count = pdfDoc.numPages;
  await pdfDoc.destroy(); // release memory immediately
  return count;
}

async function renderPdfPage(fileBuffer, pageNum, scale = 1.5) {
  const loadingTask = getDocument({ data: new Uint8Array(fileBuffer) });
  const pdfDoc = await loadingTask.promise;
  

  
    const page = await pdfDoc.getPage(pageNum);
    const viewport = page.getViewport({ scale }); // scale up for OCR clarity

    const canvas = createCanvas(viewport.width, viewport.height);
    const context = canvas.getContext("2d");

    await page.render({ canvasContext: context, viewport }).promise;

    const pngBuffer = canvas.toBuffer("image/png");
    await pdfDoc.destroy(); // free this page's resources before returning
  return pngBuffer;
}
module.exports = { renderPdfPage, getPdfPageCount };