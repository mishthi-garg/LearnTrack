// services/processDocument.js
const pkg = require("pdf-parse");
const pdfParse = pkg.default || pkg;
const { fromBuffer } = require("pdf2pic");
const vision = require("@google-cloud/vision");
const { supabase, getEmbedding } = require("../lib/client.js");
const mammoth = require("mammoth");


const credentials = JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS);

const visionClient = new vision.ImageAnnotatorClient({ credentials });

function chunkText(text, wordsPerChunk = 400) {
  const words = text.split(/\s+/).filter(Boolean);
  const chunks = [];
  for (let i = 0; i < words.length; i += wordsPerChunk) {
    chunks.push(words.slice(i, i + wordsPerChunk).join(" "));
  }
  return chunks;
}

// Heuristic: if extracted text is too short/sparse, assume it's a scanned doc
function isTextSufficient(text, minWordsPerAssumedPage = 20) {
  const wordCount = text.trim().split(/\s+/).filter(Boolean).length;
  return wordCount > minWordsPerAssumedPage;
}

async function extractFromPDF(fileBuffer) {
  let text = "";
  try {
    const parsed = await pdfParse(fileBuffer);
    text = parsed.text;
  } catch (err) {
    console.warn("pdf-parse failed:", err.message);
  }

  if (!isTextSufficient(text)) {
    console.log("PDF looks scanned — falling back to OCR");
    text = await extractViaOCR(fileBuffer);
  }
  return text;
}

async function extractViaOCR(fileBuffer) {
  const converter = fromBuffer(fileBuffer, {
    density: 200,
    format: "png",
    width: 1600,
    height: 2000,
  });

  // Convert all pages — pdf2pic needs page count; get it via pdf-parse metadata
  const pdfMeta = await pdfParse(fileBuffer);
  const numPages = pdfMeta.numpages || 1;

  let fullText = "";

  for (let page = 1; page <= numPages; page++) {
    const result = await converter(page, { responseType: "buffer" });
    const [ocrResult] = await visionClient.textDetection({
      image: { content: result.buffer },
    });
    const pageText = ocrResult.fullTextAnnotation?.text || "";
    fullText += pageText + "\n";
  }
  return fullText;
}


async function extractFromDocx(fileBuffer) {
  const result = await mammoth.extractRawText({ buffer: fileBuffer });
  return result.value;
}

async function extractFromPlainText(fileBuffer) {
  return fileBuffer.toString("utf-8");
}

async function extractFromImage(fileBuffer) {
  // straight to OCR — no text layer possible in a raw image
  const [ocrResult] = await visionClient.textDetection({
    image: { content: fileBuffer },
  });
  return ocrResult.fullTextAnnotation?.text || "";
}

// --- Main dispatcher ---

async function extractText(fileBuffer, mimeType) {
  switch (mimeType) {
    case "application/pdf":
      return { text: await extractFromPDF(fileBuffer), method: "pdf" };

    case "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
      return { text: await extractFromDocx(fileBuffer), method: "docx" };

    case "text/plain":
    case "text/markdown":
      return { text: await extractFromPlainText(fileBuffer), method: "plaintext" };

    default:
      if (mimeType.startsWith("image/")) {
        return { text: await extractFromImage(fileBuffer), method: "image_ocr" };
      }
      throw new Error(`Unsupported file type: ${mimeType}`);
  }
}

async function processDocument(doc, fileBuffer, mimeType) {
  let text = "";
  let method = "unknown";

  try {
    const result = await extractText(fileBuffer, mimeType);
    text = result.text;
    method = result.method;
  } catch (err) {
    console.error(`Extraction failed for document ${doc.id}:`, err.message);
    await supabase
      .from("documents")
      .update({ processing_status: "failed", processing_error: err.message })
      .eq("id", doc.id);
    return;
  }

  if (!isTextSufficient(text, 5)) {
    console.error(`No usable text extracted for document ${doc.id}`);
    await supabase
      .from("documents")
      .update({ processing_status: "failed", processing_error: "No text extracted" })
      .eq("id", doc.id);
    return;
  }

  const chunks = chunkText(text);

  for (const chunk of chunks) {
  if (!chunk.trim()) continue;
  const embedding = await getEmbedding(chunk);

  const { error: chunkError } = await supabase
    .from("document_chunks")
    .insert({
      document_id: doc.id,
      user_id: doc.user_id,
      course_code: doc.course_code,
      semester: doc.semester,
      chunk_text: chunk,
      embedding,
    });

  if (chunkError) {
    console.error(`Chunk insert failed for doc ${doc.id}:`, chunkError);
  }
}
  await supabase
    .from("documents")
    .update({ processing_status: "done", extraction_method: method })
    .eq("id", doc.id);
}
module.exports = { processDocument };