// services/pdfToImages.js
const { getDocument } = require("pdfjs-dist/legacy/build/pdf.mjs");
const { createCanvas } = require("@napi-rs/canvas");

async function pdfToImageBuffers(fileBuffer) {
  const loadingTask = getDocument({ data: new Uint8Array(fileBuffer) });
  const pdfDoc = await loadingTask.promise;
  const buffers = [];

  for (let pageNum = 1; pageNum <= pdfDoc.numPages; pageNum++) {
    const page = await pdfDoc.getPage(pageNum);
    const viewport = page.getViewport({ scale: 2.0 }); // scale up for OCR clarity

    const canvas = createCanvas(viewport.width, viewport.height);
    const context = canvas.getContext("2d");

    await page.render({ canvasContext: context, viewport }).promise;

    const pngBuffer = canvas.toBuffer("image/png");
    buffers.push(pngBuffer);
  }

  return buffers;
}
module.exports = { pdfToImageBuffers };