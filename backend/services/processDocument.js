// services/processDocument.js
const pkg = require("pdf-parse");
const pdfParse = pkg.default || pkg;
const { getPdfPageCount, renderPdfPage } = require("./pdfToImages.js");
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

async function extractAndStoreViaOCR(doc) {
  const fileBuffer = doc._fileBuffer; // passed through, see processDocument below
  const numPages = await getPdfPageCount(fileBuffer);

  let anyTextFound = false;

  for (let pageNum = 1; pageNum <= numPages; pageNum++) {
     console.log(`Processing page ${pageNum}/${numPages} for doc ${doc.id}`);

    let imgBuffer;
    try {
      imgBuffer = await renderPdfPage(fileBuffer, pageNum, 3.0);
    } catch (err) {
      console.error(`Failed to render page ${pageNum}:`, err.message);
      continue;
    }
    if (!imgBuffer || imgBuffer.length === 0) {
      console.warn(`Empty image for page ${pageNum}, skipping`);
      continue;
    }
    const [ocrResult] = await visionClient.documentTextDetection({
      image: { content: imgBuffer },
    });
    const pageText = ocrResult.fullTextAnnotation?.text || "";
    // free the buffer reference explicitly
    imgBuffer = null;

    if (!pageText.trim()) continue;
    anyTextFound = true;

    // chunk + embed THIS PAGE only, then discard its text too
    const pageChunks = chunkText(pageText);
    for (const chunk of pageChunks) {
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
        console.error(`Chunk insert failed (page ${pageNum}, doc ${doc.id}):`, chunkError);
      }
    }
  }
  return anyTextFound;
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
  try{
  if (mimeType === "application/pdf") {
      // Try normal text extraction first (cheap, fast, no memory concern)
      let text = "";
      try {
        const parsed = await pdfParse(fileBuffer);
        text = parsed.text;
      } catch (err) {
        console.warn("pdf-parse failed:", err.message);
      }

      if (isTextSufficient(text)) {
        // typed PDF — chunk/embed normally, all in memory is fine since it's just text, not images
        const chunks = chunkText(text);
        for (const chunk of chunks) {
          if (!chunk.trim()) continue;
          const embedding = await getEmbedding(chunk);
          const { error } = await supabase.from("document_chunks").insert({
            document_id: doc.id,
            user_id: doc.user_id,
            course_code: doc.course_code,
            semester: doc.semester,
            chunk_text: chunk,
            embedding,
          });
          if (error) console.error(`Chunk insert failed for doc ${doc.id}:`, error);
        }
        await supabase
          .from("documents")
          .update({ processing_status: "done", extraction_method: "pdf" })
          .eq("id", doc.id);
        return;
      }

      // scanned PDF — stream page-by-page instead
      console.log("PDF looks scanned — using streaming OCR");
      doc._fileBuffer = fileBuffer;
      const foundText = await extractAndStoreViaOCR(doc);

      await supabase
        .from("documents")
        .update({
          processing_status: foundText ? "done" : "failed",
          processing_error: foundText ? null : "No text extracted via OCR",
          extraction_method: "image_ocr",
        })
        .eq("id", doc.id);
      return;
    }

  
    const result = await extractText(fileBuffer, mimeType);
     const chunks = chunkText(result.text);
  

  if (!isTextSufficient(result.text, 5)) {
    
    await supabase
      .from("documents")
      .update({ processing_status: "failed", processing_error: "No text extracted" })
      .eq("id", doc.id);
    return;
  }

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
    .update({ processing_status: "done", extraction_method: result.method })
    .eq("id", doc.id);

    } catch (err) {
    console.error(`Processing failed for doc ${doc.id}:`, err.message);
    await supabase
      .from("documents")
      .update({ processing_status: "failed", processing_error: err.message })
      .eq("id", doc.id);
  }
}
module.exports = { processDocument };