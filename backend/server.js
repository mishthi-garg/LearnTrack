
const express = require("express"); const cors = require("cors");
const axios = require("axios");
const { createClient } = require("@supabase/supabase-js");
require("dotenv").config();

const documentsRouter = require("./routes/documents.js");
const tutorChatRouter = require("./routes/tutorChat.js");
const studyPlanChatRouter = require("./routes/studyPlanChat.js");

const googleAuthRoutes = require("./routes/googleAuth.js");
const googleSyncRoutes = require("./routes/googleSync.js");

const modelStats = require("./model_stats.json");
const TRAINING_MEAN = modelStats.training_mean;//63
const TRAINING_STD = modelStats.training_std;//11
const MIN_COHORT_SIZE = 30; // or 15, depending on your requirement

const app = express();
app.use(cors());
app.use(express.json());

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);
// console.log("Service key exists:", !!process.env.SUPABASE_SERVICE_KEY);
// console.log("First 20 chars:", process.env.SUPABASE_SERVICE_KEY?.slice(0, 20));

app.use("/api", documentsRouter);
app.use("/api", tutorChatRouter);
app.use("/api", studyPlanChatRouter);

app.use(googleSyncRoutes);
app.use(googleAuthRoutes);

app.get("/", (req, res) => {
    res.json({ status: "LearnTrack Backend is running" });
});

app.post("/cohort-stats", async (req, res) => {
    const { course_code } = req.body;

    const { data: cohortData, error } = await supabase
        .from("marks")
        .select("user_id, marks_scored, max_marks, weightage")
        .eq("course_code", course_code);

    if (error) return res.status(500).json({ error: error.message });

    const cohortByUser = {};
    cohortData?.forEach((m) => {
        if (!m.max_marks || !m.weightage || m.max_marks === 0) return;
        if (!cohortByUser[m.user_id]) cohortByUser[m.user_id] = { sum: 0, weight: 0 };
        cohortByUser[m.user_id].sum += (m.marks_scored / m.max_marks) * m.weightage;
        cohortByUser[m.user_id].weight += m.weightage;
    });

    const cohortScores = Object.values(cohortByUser)
        .filter((u) => u.weight > 0)
        .map((u) => u.sum / u.weight);

    const cohortStudentCount = cohortScores.length;

    let cohortMean, cohortStd;
    if (cohortStudentCount >= MIN_COHORT_SIZE) {
        cohortMean = cohortScores.reduce((a, b) => a + b, 0) / cohortScores.length;
        cohortStd = Math.sqrt(
            cohortScores.reduce((sum, s) => sum + Math.pow(s - cohortMean, 2), 0) / cohortScores.length
        );
    } else {
        cohortMean = TRAINING_MEAN;
        cohortStd = TRAINING_STD;
    }

    return res.json({
        course_code,
        cohort_mean: parseFloat(cohortMean.toFixed(3)),
        cohort_std: parseFloat(cohortStd.toFixed(3)),
        cohort_size: cohortStudentCount,
        using_fallback: cohortStudentCount < MIN_COHORT_SIZE,
        grade_boundaries: modelStats.grade_boundaries,
    });
});

app.post("/predict", async (req, res) => {
    const { user_id, course_code } = req.body;
    console.log("user_id:", user_id);
    console.log("course_code:", course_code);
    if (!user_id || !course_code) {
        return res.status(400).json({ error: "user_id and course_code are required" });
    }
    console.log("1. Before marks query");
    const { data: marksData, error: marksError } = await supabase
        .from("marks")
        .select("*")
        .eq("user_id", user_id)
        .eq("course_code", course_code);
    console.log("2. After marks query");
    console.log(marksData);
    if (marksError) console.dir(marksError, { depth: null });
    //if (marksError) return res.status(500).json({ error: marksError.message });
    if (!marksData || marksData.length === 0) {
        return res.status(400).json({ error: "No marks found for this subject" });
    }

    console.log("3. Before cohort query");
    const { data: cohortData, error: cohortError } = await supabase
        .from("marks")
        .select("user_id, exam_type, marks_scored, max_marks, weightage")
        .eq("course_code", course_code);

    console.log("4. After cohort query");
    if (cohortError) return res.status(500).json({ error: cohortError.message });
    const cohortStudentCount = new Set(cohortData.map(m => m.user_id)).size;
    // Calculate overall_z as weighted sum of per-assessment z-scores


    // Step 1: Group cohort marks by user_id, compute each user's weighted_pct
    const cohortByUser = {};
    cohortData.forEach((m) => {
        if (!m.max_marks || !m.weightage || m.max_marks === 0) return;
        if (!cohortByUser[m.user_id]) cohortByUser[m.user_id] = { sum: 0, totalWeight: 0 };
        cohortByUser[m.user_id].sum += (m.marks_scored / m.max_marks) * m.weightage;
        cohortByUser[m.user_id].totalWeight += m.weightage;
    });

    // Convert to weighted_pct per user (same as training: divide by total weightage)
    const cohortScores = Object.values(cohortByUser)
        .filter((u) => u.totalWeight > 0)
        .map((u) => u.sum / u.totalWeight);

    // Step 2: Compute cohort mean and std of weighted_pct
    const computedMean = cohortScores.reduce((a, b) => a + b, 0) / cohortScores.length;
    const computedStd = Math.sqrt(
        cohortScores.reduce((sum, s) => sum + Math.pow(s - computedMean, 2), 0) / cohortScores.length
    );

    let cohortMean = computedMean;
    let cohortStd = computedStd;

    if (
        cohortStudentCount < MIN_COHORT_SIZE ||
        !Number.isFinite(cohortMean) ||
        !Number.isFinite(cohortStd) ||
        cohortStd <= 0
    ) {
        cohortMean = TRAINING_MEAN;
        cohortStd = TRAINING_STD;
    }

    // Step 3: Compute this student's weighted_pct
    const studentSum = marksData.reduce((sum, m) => {
        if (!m.max_marks || !m.weightage || m.max_marks === 0) return sum;
        return sum + (m.marks_scored / m.max_marks) * m.weightage;
    }, 0);

    const studentTotalWeight = marksData.reduce((sum, m) => sum + (m.weightage || 0), 0);

    if (studentTotalWeight === 0) {
        return res.status(400).json({ error: "No valid weightage data found" });
    }

    const studentWeightedPct = studentSum / studentTotalWeight;

    // Step 4: Z-score (match training formula exactly)
    const overall_z = cohortStd > 0 ? (studentWeightedPct - cohortMean) / cohortStd : 0;

    try {
        const mlResponse = await axios.post(`${process.env.ML_SERVICE_URL}/predict`, {
            overall_z,
        });

        return res.json({
            course_code,
            overall_z: parseFloat(overall_z.toFixed(3)),
            predicted_grade: mlResponse.data.predicted_grade,
            confidence: mlResponse.data.confidence,
        });

    } catch (mlError) {
        return res.status(500).json({ error: "ML service unavailable", overall_z });
    }
});

app.post("/google/webhook", async (req, res) => {
    res.sendStatus(200);   // Respond immediately

    console.log("===== GOOGLE WEBHOOK =====");

    const channelId = req.headers["x-goog-channel-id"];
    const resourceState = req.headers["x-goog-resource-state"];

    console.log(channelId, resourceState);

    if (resourceState === "sync") {
        return;
    }

    // We'll add sync logic here next
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Backend running on port ${PORT}`));