import { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";

function ChangeSemesterModal({ user, currentSemester, subjects, onClose, onComplete }) {
    const [finalGrades, setFinalGrades] = useState({});
    const [saving, setSaving] = useState(false);
    const [alreadySaved, setAlreadySaved] = useState([]);
    const [subjectMarks, setSubjectMarks] = useState({});
    const [session, setSession] = useState("");

    useEffect(() => {
        if (!user) return;

        const fetchMarks = async () => {
            const { data, error } = await supabase
                .from("marks")
                .select("*")
                .eq("user_id", user.id);
            if (!error && data) {
                const grouped = {};
                data.forEach((m) => {
                    if (!grouped[m.course_code]) grouped[m.course_code] = [];
                    grouped[m.course_code].push(m);
                });

                const totals = {};
                Object.entries(grouped).forEach(([code, entries]) => {
                    let weightedSum = 0;
                    let totalWeight = 0;
                    entries.forEach((e) => {
                        const scored = parseFloat(e.marks_scored);
                        const max = parseFloat(e.max_marks);
                        const weight = parseFloat(e.weightage);

                        const valid = !isNaN(scored) && !isNaN(max) && max > 0 && !isNaN(weight);
                        console.log("Entry:", e.exam_type, "valid:", valid, "scored:", scored, "max:", max, "weight:", weight);

                        if (valid) {
                            const percentOfExam = (scored / max) * weight;
                            console.log("percentOfExam:", percentOfExam);
                            weightedSum += percentOfExam;
                            totalWeight += weight;
                        }
                    });
                    console.log("Final for", code, "weightedSum:", weightedSum, "totalWeight:", totalWeight);

                    totals[code] = totalWeight > 0 ? parseFloat(weightedSum.toFixed(2)) : "";
                });
                setSubjectMarks(totals);
            }
        };
        fetchMarks();
    }, [user]);

    useEffect(() => {
        if (!user || !currentSemester) return;

        const checkExisting = async () => {
            const { data, error } = await supabase
                .from("past_grades")
                .select("*")
                .eq("user_id", user.id)
                .eq("semester", currentSemester);

            if (!error && data) {
                setAlreadySaved(data.map((d) => d.course_code));
            }
        };
        checkExisting();
    }, [user, currentSemester]);

    const handleGradeInput = (courseCode, value) => {
        setFinalGrades((prev) => ({
            ...prev,
            [courseCode]: value
        }));
    };

    const handleConfirm = async () => {
        setSaving(true);

        const subjectsToMigrate = subjects.filter(
            (s) => !alreadySaved.includes(s.course_code)
        );

        const rowsToInsert = subjectsToMigrate
            .filter(
                (s) => finalGrades[s.course_code]?.trim()
            ).map(
                (s) => ({
                    user_id: user.id,
                    course_code: s.course_code,
                    subject_name: s.name,
                    credits: s.credits,
                    semester: currentSemester,
                    session: session,
                    grade: finalGrades[s.course_code],
                    marks: subjectMarks[s.course_code] ?? null,
                })
            );
        if (rowsToInsert.length > 0) {
            const { error: insertError } = await supabase
                .from("past_grades")
                .insert(rowsToInsert);
            if (insertError) {
                console.error("Error saving past grades:", insertError);
                setSaving(false);
                return;
            }
        }

        const { error: deleteError } = await supabase
            .from("marks")
            .delete()
            .eq("user_id", user.id);
        if (deleteError) {
            console.error("Error clearing marks:", deleteError);
            setSaving(false);
            return;
        }

        const { error: subjectDeleteError } = await supabase
            .from("subjects")
            .delete()
            .eq("user_id", user.id);

        if (subjectDeleteError) {
            console.error("Error clearing subjects:", subjectDeleteError);
            setSaving(false);
            return;
        }

        setSaving(false);
        onComplete();
    }
    return (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
            <div className="bg-[rgb(238,238,238)] flex flex-col gap-6 rounded-2xl shadow-xl p-6 w-full maw-w-lg max-h-[80vh] overflow-y-auto">
                <div className="flex items-center justify-between">
                    <h2 className="text-xl cause font-bold text-[rgb(40,20,9)]">
                        Enter Final Grades
                    </h2>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
                    >
                        <span>&times;</span>
                    </button>
                </div>
                <p className="text-sm text-[rgb(75,64,56)]">
                    If any subjects already saved in Past Grades will be saved automatically.
                </p>
                <div className="flex gap-2 items-center">
                    <label className="text-md space-mono-bold">Session:</label>
                    <input
                        type="text"
                        value={session}
                        onChange={(e) => setSession(e.target.value)}
                        placeholder="e.g. 2024-25"
                        className="border-gray-400 border rounded-lg p-2 text-sm focus:outline-none focus:ring-2 focus:ring-[rgb(75,86,148)]"
                    />
                </div>
                <div className="flex flex-col gap-3">
                    {
                        subjects.filter((s) => s.course_code).length === 0 ? (
                            <p className="text-sm text-red-500">No subjects available</p>
                        ) : (
                            subjects.map((subject) => {
                                if (!subject.course_code) return null;
                                const isSkipped = alreadySaved.includes(subject.course_code);
                                return (
                                    <div key={subject.id}
                                        className="flex items-center gap-3"
                                    >
                                        <span className="flex-1 text-sm">
                                            {subject.name} <span className="text-gray-400">({subject.course_code})</span>
                                        </span>
                                        {
                                            isSkipped ? (
                                                <span className="text-sm italic text-[rgb(32,41,64)]">Already saved</span>
                                            ) : (
                                                <div className="flex gap-3">
                                                    <input
                                                        type="text"
                                                        placeholder="Final marks"
                                                        value={subjectMarks[subject.course_code] ?? ""}
                                                        onChange={(e) => setSubjectMarks((prev) => ({
                                                            ...prev,
                                                            [subject.course_code]: e.target.value
                                                        }))}
                                                        className="border border-gray-400 rounded-lg p-2 text-sm w-28 focus:outline-none focus:ring-2 focus:ring-[rgb(75,86,148)]"
                                                    />
                                                    {/* <input
                                                        type="text"
                                                        placeholder="Final grade"
                                                        value={finalGrades[subject.course_code] || ""}
                                                        onChange={(e) => handleGradeInput(subject.course_code, e.target.value)}
                                                        className="border rounded-lg p-2 text-sm w-28 focus:outline-none focus:ring-2 focus:ring-[rgb(75,86,148)]"
                                                    /> */}
                                                    <div className="flex items-center gap-2">
                                                        <label for="final_grades" className="text-gray-500 text-sm">Final Grade:</label>
                                                        <select name="final_grades" id="final_grades" className="text-sm"
                                                            value={finalGrades[subject.course_code] || ""}
                                                            onChange={(e) => handleGradeInput(subject.course_code, e.target.value)}>
                                                            <option value="" disabled hidden>Select</option>
                                                            <option value="A">A</option>
                                                            <option value="AB">AB</option>
                                                            <option value="B">B</option>
                                                            <option value="BC">BC</option>
                                                            <option value="C">C</option>
                                                            <option value="CD">CD</option>
                                                            <option value="D">D</option>
                                                            <option value="F">F</option>
                                                        </select>
                                                    </div>
                                                </div>
                                            )
                                        }
                                    </div>
                                );
                            })
                        )
                    }
                </div>
                <div className="flex justify-end gap-3 mt-6 items-center">
                    <button onClick={onClose} className="exo px-4 py-2 text-sm text-gray-500 hover:text-gray-700">
                        Cancel
                    </button>
                    <button
                        onClick={handleConfirm}
                        disabled={saving}
                        className="sniglet-regular bg-[rgb(75,86,148)] disabled:opacity-50 text-white font-bold px-4 py-2 rounded-lg text-sm hover:bg-[rgb(32,41,64)]"
                    >
                        {saving ? "Processing..." : "Confirm & Start New Semester"}
                    </button>
                </div>
            </div>
        </div>
    )
}

export default ChangeSemesterModal;