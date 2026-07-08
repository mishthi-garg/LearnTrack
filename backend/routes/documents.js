// routes/documents.js
const express = require("express");
const multer = require("multer");
const { supabase } = require("../lib/client.js");
const { processDocument } = require("../services/processDocument.js");

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

router.post("/upload", upload.single("file"), async (req, res) => {
  try {
    const { userId, courseCode, semester } = req.body;
    const file = req.file;

    const filePath = `${userId}/${courseCode}/${Date.now()}_${file.originalname}`;

    const { error: uploadError } = await supabase.storage
      .from("documents")
      .upload(filePath, file.buffer, { contentType: file.mimetype });
    if (uploadError) throw uploadError;

    const { data: inserted, error: insertError } = await supabase
      .from("documents")
      .insert({
        user_id: userId,
        course_code: courseCode,
        semester,
        file_name: file.originalname,
        file_path: filePath,
        type: file.mimetype,
      })
      .select()
      .single();
    if (insertError) throw insertError;

    // process in background — don't block the upload response
    processDocument(inserted, file.buffer, file.mimetype).catch((err) =>
      console.error("Processing failed:", err)
    );
    
    res.json({ document: inserted });
  } catch (err) {
    console.error("Upload failed:", err);
    res.status(500).json({ error: "Upload failed" });
  }
});

module.exports = router;