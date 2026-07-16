import { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;
const subjects1 = {
    OS: [
        { grade: "A", min: 88, max: 100 },
        { grade: "AB", min: 78, max: 87 },
        { grade: "BC", min: 68, max: 77 },
        { grade: "C", min: 55, max: 67 },
        { grade: "CD", min: 45, max: 54 },
        { grade: "D", min: 33, max: 44 },
        { grade: "F", min: 0, max: 32 },
    ],
    ESIOT: [
        { grade: "A", min: 82, max: 100 },
        { grade: "AB", min: 72, max: 81 },
        { grade: "BC", min: 62, max: 71 },
        { grade: "C", min: 50, max: 61 },
        { grade: "CD", min: 40, max: 49 },
        { grade: "D", min: 30, max: 39 },
        { grade: "F", min: 0, max: 29 },
    ],
    ADC: [
        { grade: "A", min: 90, max: 100 },
        { grade: "AB", min: 80, max: 89 },
        { grade: "BC", min: 70, max: 79 },
        { grade: "C", min: 58, max: 69 },
        { grade: "CD", min: 47, max: 57 },
        { grade: "D", min: 35, max: 46 },
        { grade: "F", min: 0, max: 34 },
    ],
    CCN: [
        { grade: "A", min: 85, max: 100 },
        { grade: "AB", min: 74, max: 84 },
        { grade: "BC", min: 63, max: 73 },
        { grade: "C", min: 52, max: 62 },
        { grade: "CD", min: 42, max: 51 },
        { grade: "D", min: 31, max: 41 },
        { grade: "F", min: 0, max: 30 },
    ],
};

// function SubjectPanel({ subject }) {
//     const ranges = subjects1[subject];


//     return (
//         <div className="my-4 flex items-center justify-center">
//             <div className="border-2 border-[rgb(75,64,56)] bg-[rgb(238,238,238)] rounded-2xl shadow-xl p-6 overflow-x-auto">

//                 <div className="flex gap-2">
//                     {ranges.map((g) => (
//                         <div
//                             key={g.grade}
//                             className={`flex gap-4 items-center justify-between px-4 py-3 rounded-lg bg-[rgb(202,170,152,0.2)] text-[rgb(75,64,56)]`}
//                         >
//                             <span className="font-bold text-lg">{g.grade}</span>
//                             <span className="text-sm">{g.min} – {g.max} marks</span>
//                         </div>
//                     ))}
//                 </div>
//             </div>
//         </div>
//     );
// }
function SubjectPanel({ ranges, predictedGrade }) {
    return (
        <div className="my-4 flex items-center justify-center">
            <div className="border-2 border-[rgb(75,64,56)] bg-[rgb(238,238,238)] rounded-2xl shadow-xl px-6 py-4 w-full">
                <div className="flex gap-4 overflow-x-auto justify-between">
                    {ranges.map((g) => (
                        <div
                            key={g.grade}
                            className={`fraunces flex gap-4 flex-1 items-center justify-between px-4 py-3 rounded-lg transition-all duration-200
                                ${predictedGrade === g.grade
                                    ? "bg-yellow-50 text-yellow-800 scale-105 shadow-md"
                                    : "bg-[rgb(202,170,152,0.2)] text-[rgb(75,64,56)]"
                                }`}
                        >
                            <span className="font-bold text-lg">{g.grade}</span>
                            <span className="text-sm">{g.min}–{g.max}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}



function Predict({ user }) {
    const [selectedSubject, setSelectedSubject] = useState(null);
    const [expectedMarks, setExpectedMarks] = useState({});

    const [viewMarks, setViewMarks] = useState("");

    const [subjects, setSubjects] = useState([]);
    const [marks, setMarks] = useState({});
    const [inputs, setInputs] = useState({});
    const [saving, setSaving] = useState(null);

    const [grades, setGrades] = useState([]);
    const [gradeInput, setGradeInput] = useState({});
    const [savingGrade, setSavingGrade] = useState(null);

    const [newSemester, setNewSemester] = useState("");
    const [newSession, setNewSession] = useState("");

    const formatSemester = (value) => value.toUpperCase().replace(/\s/g, "");
    const [predictions, setPredictions] = useState({});
    const [predicting, setPredicting] = useState(null);
    const [cohortStats, setCohortStats] = useState({});

    const handlePredict = async (subject) => {
        const subjectMarks = marks[subject.course_code];
        if (!subjectMarks || subjectMarks.length === 0) return;

        setPredicting(subject.course_code);

        try {
            const response = await fetch(`${BACKEND_URL}/predict`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    user_id: user.id,
                    course_code: subject.course_code,
                }),
            });
            const result = await response.json();
            setPredictions((prev) => ({
                ...prev,
                [subject.course_code]: result,
            }));
        } catch (err) {
            console.error("Prediction error:", err);
        }

        setPredicting(null);
    };

    const computeGradeRanges = (mean, std, boundaries) => {
        // boundaries from model_stats.json e.g. { "F_to_D": -2.45, "D_to_CD": -1.82, ... }
        const cutoffs = [
            { grade: "A", minZ: boundaries?.AB_to_A ?? 1.5 },
            { grade: "AB", minZ: boundaries?.BC_to_AB ?? 0.75 },
            { grade: "BC", minZ: boundaries?.C_to_BC ?? 0 },
            { grade: "C", minZ: boundaries?.CD_to_C ?? -0.75 },
            { grade: "CD", minZ: boundaries?.D_to_CD ?? -1.5 },
            { grade: "D", minZ: boundaries?.F_to_D ?? -2.0 },
            { grade: "F", minZ: -Infinity },
        ];

        return cutoffs.map((c, i) => {
            const minPct = c.minZ === -Infinity ? 0 : mean + c.minZ * std;
            const maxPct = i === 0 ? 1 : mean + cutoffs[i - 1].minZ * std;
            return {
                grade: c.grade,
                min: Math.max(0, Math.round(minPct * 100)),
                max: Math.min(100, Math.round(maxPct * 100)),
            };
        });
    };

    useEffect(() => {
        if (!subjects || subjects.length === 0) return;

        const fetchCohortStats = async () => {
            const results = {};
            await Promise.all(subjects.map(async (subject) => {
                try {
                    const response = await fetch(`${BACKEND_URL}/cohort-stats`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ course_code: subject.course_code }),
                    });

                    const text = await response.text();
                    console.log("Raw response for", subject.course_code, ":", text);

                    const data = JSON.parse(text);
                    results[subject.course_code] = data;
                } catch (err) {
                    console.error("Error fetching cohort stats for", subject.course_code, err);
                }
            }));
            setCohortStats(results);
        };

        fetchCohortStats();
    }, [subjects]);

    useEffect(() => {
        if (!user) return;

        const fetchSubjects = async () => {
            const { data, error } = await supabase
                .from("subjects")
                .select("*")
                .eq("user_id", user.id);
            if (error) console.error("Error fetching subjects:", error);
            else setSubjects(data);
        };
        fetchSubjects();
    }, [user]);

    useEffect(() => {
        if (!user) return;

        const fetchGrades = async () => {
            const { data, error } = await supabase
                .from("past_grades")
                .select("*")
                .eq("user_id", user.id)
            if (error) console.error("Error fetching past grades:", error);
            else {
                setGrades(data.map((s) => ({
                    id: s.id,
                    courseCode: s.course_code || "",
                    semester: s.semester || "",
                    grade: s.grade || "",
                    marks: s.marks || "",
                    session: s.session || "",
                    subjectName: s.subject_name || "",
                    credits: s.credits || "",
                })));

            }
        };
        fetchGrades();
    }, [user]);

    useEffect(() => {
        if (!user || subjects.length === 0) return;

        const fetchMarks = async () => {
            const { data, error } = await supabase
                .from("marks")
                .select("*")
                .eq("user_id", user.id)
            if (error) console.error("Error fetching marks:", error);
            else {
                const grouped = {};
                data.forEach((row) => {
                    if (!grouped[row.course_code]) grouped[row.course_code] = [];
                    grouped[row.course_code].push(row);
                })
                setMarks(grouped);
            }
        }
        fetchMarks();
    }, [user, subjects]);

    const handleInputChange = (courseCode, field, value) => {
        setInputs(
            (prev) => ({
                ...prev,
                [courseCode]: {
                    ...prev[courseCode],
                    [field]: value,
                },
            })
        );
    };

    const handleGradeInput = (semester, field, value) => {
        setGradeInput(
            (prev) => ({
                ...prev,
                [semester]: {
                    ...prev[semester],
                    [field]: value,
                }
            })
        )
    };

    const handleAddMarks = async (subject) => {
        const input = inputs[subject.course_code] || {};
        if (!input.exam_type || !input.marks_scored) return;

        setSaving(subject.course_code);

        const newEntry = {
            user_id: user.id,
            course_code: subject.course_code,
            exam_type: input.exam_type,
            marks_scored: parseFloat(input.marks_scored),
            max_marks: parseFloat(input.max_marks) || "",
            weightage: parseFloat(input.weightage) || "",
        };

        const { data, error } = await supabase
            .from("marks")
            .insert(newEntry)
            .select()
            .single();

        if (error) console.error("Error saving marks:", error);
        else {
            setMarks((prev) => ({
                ...prev,
                [subject.course_code]: [...(prev[subject.course_code] || []), data],
            }));

            setInputs((prev) => ({
                ...prev,
                [subject.course_code]: {
                    exam_type: "",
                    marks_scored: "",
                    max_marks: "",
                    weightage: ""
                },
            }));
        }
        setSaving(null);
    };



    const removeGrade = async (id) => {
        const { error } = await supabase
            .from("past_grades")
            .delete()
            .eq("id", id);
        if (error) console.error("Error deleting grade:", error);
        else setGrades(grades.filter((g) => g.id !== id));
    };

    const handleSaveGrade = async (semester, semesterSession) => {
        setSavingGrade(semester);

        const newEntry = {
            user_id: user.id,
            course_code: gradeInput[semester].courseCode || "",
            semester: semester || "",
            grade: gradeInput[semester].grade || "",
            marks: parseFloat(gradeInput[semester].marks) || "",
            session: semesterSession || "",
            subject_name: gradeInput[semester].subjectName || "",
            credits: parseFloat(gradeInput[semester].credits) || "",
        };

        console.log("trying to save: ", newEntry);

        const { data, error } = await supabase
            .from("past_grades")
            .insert(newEntry)
            .select()
            .single();

        if (error) console.error("Error saving grades:", error);
        else {
            setGrades((prev) => [...prev, {
                id: data.id,
                courseCode: data.course_code || "",
                semester: data.semester || "",
                grade: data.grade || "",
                marks: data.marks || "",
                session: data.session || "",
                subjectName: data.subject_name || "",
                credits: data.credits || "",
            }])
        }
        setGradeInput({
            courseCode: "",
            grade: "",
            marks: "",
            session: "",
            subjectName: "",
            credits: "",
        })
        setSavingGrade(null);
    };




    const handleDeleteMark = async (id, courseCode) => {
        const { error } = await supabase
            .from("marks")
            .delete()
            .eq("id", id);
        if (error) console.error("Error deleting mark:", error);
        else {
            setMarks((prev) => ({
                ...prev,
                [courseCode]: prev[courseCode].filter((m) => m.id !== id),
            }));
        }
    }

    return (
        <div>
            <h1 className="cause text-3xl font-bold text-[rgb(32,41,64)]">Predict</h1>
            <div className="text-md bg-yellow-50 border border-yellow-300 my-4 p-4 rounded-lg text-yellow-800">
                Since the grades are relative, predictions will be based using a placeholder mean and standard deviation until 30+ students join the platform and provide marks for the same course.
            </div>
            <div className="flex gap-4 mt-4">
                <button className={`sniglet-regular text-white px-4 py-2 rounded-lg hover:bg-[rgb(32,41,64)] cursor-pointer
                    ${viewMarks === "current" ? "bg-[rgb(32,41,64)]" : "bg-[rgb(75,86,148)]"
                    }`}
                    onClick={() => {
                        viewMarks === "current" ? setViewMarks("") : setViewMarks("current");
                    }}
                >
                    Current Marks Till Now
                </button>
                <button className={`sniglet-regular text-white px-4 py-2 rounded-lg hover:bg-[rgb(32,41,64)] cursor-pointer
                    ${viewMarks === "past" ? "bg-[rgb(32,41,64)]" : "bg-[rgb(75,86,148)]"
                    }`}
                    onClick={() => {
                        viewMarks === "past" ? setViewMarks("") : setViewMarks("past");
                    }}
                >
                    Past Grades
                </button>
            </div>

            {
                (viewMarks === "current") && (
                    <div className="bg-white rounded-lg px-4 py-2 mt-2 max-h-90 overflow-y-auto">

                        {
                            subjects.length === 0 ? (
                                <p className="text-gray-500">No subjects found. Please add subjects to your Profile.</p>
                            ) : (
                                subjects.map((subject) => (
                                    <div key={subject.id} className="my-2 bg-[rgba(202,170,152,0.2)] rounded-xl p-4 flex flex-col gap-4">
                                        
                                        <div className="flex items-center gap-3">
                                            <h2 className="space-mono-bold text-lg text-[rgb(32,41,64)]">{subject.name}</h2>
                                            <span className="text-sm text-gray-500">{subject.course_code} | {subject.credits} credits</span>
                                        </div>
                                        <div className="flex flex-col sm:flex-row items-center gap-4">
                                            <button
                                                onClick={() => handlePredict(subject)}
                                                disabled={predicting === subject.course_code || !marks[subject.course_code]?.length}
                                                className="sniglet-regular text-[rgb(32,41,64)] cursor-pointer border transition duration-200 disabled:opacity-50 hover:text-white font-bold px-4 py-2 rounded-lg text-sm hover:bg-[rgb(32,41,64)]"
                                            >
                                                {predicting === subject.course_code ? "Predicting..." : "Predict Grade"}
                                            </button>

                                            {predictions[subject.course_code] && (
                                                <div className="fraunces bg-[rgb(32,41,64)] rounded-full px-5 py-1 flex items-center gap-3">
                                                    <span className="font-bold text-xl text-white">
                                                        {predictions[subject.course_code].predicted_grade}
                                                    </span>
                                                    <span className="text-md text-white">
                                                        {Math.round((predictions[subject.course_code].confidence?.[predictions[subject.course_code].predicted_grade] || 0) * 100)}% confidence
                                                    </span>
                                                    <span className="text-sm text-white">
                                                        z-score [ {predictions[subject.course_code].overall_z} ]
                                                    </span>
                                                </div>
                                            )}
                                        </div>

                                        {
                                            marks[subject.course_code] && marks[subject.course_code].length > 0 && (
                                                <div className="overflow-x-auto">
                                                <table className="w-full text-sm border-separate border-spacing-x-2 border-spacing-y-2">
                                                    <thead>
                                                        <tr className="text-left text-gray-500 border-b">
                                                            <th className="pb-2">Exam Type</th>
                                                            <th className="pb-2">Marks</th>
                                                            <th className="pb-2">Maximum Marks</th>
                                                            <th className="pb-2">Weightage</th>
                                                            <th className="pb-2"></th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {
                                                            marks[subject.course_code].map((m) => (
                                                                <tr key={m.id} className="border-b border-gray-100">
                                                                    <td className="py-2">{m.exam_type}</td>
                                                                    <td className="py-2">{m.marks_scored}</td>
                                                                    <td className="py-2">{m.max_marks}</td>
                                                                    <td className="py-2">{m.weightage}</td>
                                                                    <td className="py-2">
                                                                        <button
                                                                            onClick={() => handleDeleteMark(m.id, subject.course_code)}
                                                                            className="exo text-red-400 hover:text-red-600 text-xs"
                                                                        >
                                                                            Delete
                                                                        </button>
                                                                    </td>
                                                                </tr>
                                                            ))
                                                        }
                                                    </tbody>
                                                </table>
                                                </div>
                                            )
                                        }

                                        <div className="flex gap-3 flex-wrap items-center">
                                            <input
                                                type="text"
                                                placeholder="Exam type (e.g. Mid1)"
                                                value={inputs[subject.course_code]?.exam_type || ""}
                                                onChange={(e) => handleInputChange(subject.course_code, "exam_type", e.target.value)}
                                                className="min-w-0 border rounded-lg p-2 text-sm focus:outline-none focus:ring-2 focus:ring-[rgb(75,86,148)]"
                                            />
                                            <input
                                                type="number"
                                                step="0.01"
                                                placeholder="Marks scored"
                                                value={inputs[subject.course_code]?.marks_scored || ""}
                                                onChange={(e) => handleInputChange(subject.course_code, "marks_scored", e.target.value)}
                                                className="min-w-0 border rounded-lg p-2 text-sm focus:outline-none focus:ring-2 focus:ring-[rgb(75,86,148)]"
                                            />
                                            <input
                                                type="number"
                                                step="0.01"
                                                placeholder="Maximum marks"
                                                value={inputs[subject.course_code]?.max_marks || ""}
                                                onChange={(e) => handleInputChange(subject.course_code, "max_marks", e.target.value)}
                                                className="min-w-0 border rounded-lg p-2 text-sm focus:outline-none focus:ring-2 focus:ring-[rgb(75,86,148)]"
                                            />
                                            <input
                                                type="number"
                                                step="0.01"
                                                placeholder="Weightage"
                                                value={inputs[subject.course_code]?.weightage || ""}
                                                onChange={(e) => handleInputChange(subject.course_code, "weightage", e.target.value)}
                                                className="min-w-0 border rounded-lg p-2 text-sm focus:outline-none focus:ring-2 focus:ring-[rgb(75,86,148)]"
                                            />
                                            <button
                                                onClick={() => handleAddMarks(subject)}
                                                disabled={saving === subject.course_code}
                                                className="sniglet-regular cursor-pointer bg-[rgb(75,86,148)] disabled:opacity-50 text-white font-bold px-4 py-2 rounded-lg text-sm hover:bg-[rgb(32,41,64)]"
                                            >
                                                {saving === subject.course_code ? "Saving..." : "Add"}
                                            </button>
                                        </div>
                                        
                                    </div>
                                ))
                            )
                        }
                    </div>
                )
            }


            {
                (viewMarks === "past") && (
                    <div className="bg-white rounded-lg px-4 pb-2 mt-2 max-h-90 overflow-y-auto">
                        <div className="sticky top-0 py-3 bg-white flex flex-col md:flex-row gap-3 items-center">
                            <div className="flex gap-3 w-full justify-between">
                                <input
                                    type="text"
                                    placeholder="New semester (e.g. SEM3)"
                                    value={newSemester}
                                    onChange={(e) => setNewSemester(formatSemester(e.target.value))}
                                    className="flex-1 min-w-0 border rounded-lg p-2 text-sm focus:outline-none focus:ring-2 focus:ring-[rgb(75,86,148)]"
                                />
                                <input
                                    type="text"
                                    placeholder="Session"
                                    value={newSession}
                                    onChange={(e) => setNewSession(e.target.value)}
                                    className="flex-1 min-w-0 border rounded-lg p-2 text-sm focus:outline-none focus:ring-2 focus:ring-[rgb(75,86,148)]"
                                />
                            </div>
                            <button
                                onClick={() => {
                                    if (newSemester.trim() === "" || newSession.trim() === "") return;
                                    setGrades(
                                        [...grades, {
                                            id: "temp-" + Date.now(),
                                            courseCode: "", subjectName: "", credits: "",
                                            session: newSession, marks: "", grade: "",
                                            semester: newSemester
                                        }]
                                    );
                                    setNewSemester("");
                                    setNewSession("");
                                }}
                                className="sniglet-regular cursor-pointer w-full bg-[rgb(75,86,148)] text-white font-bold px-4 py-2 rounded-lg text-sm hover:bg-[rgb(32,41,64)]"
                            >
                                Add Semester
                            </button>
                        </div>
                        {
                            (() => {
                                const grouped = {};
                                grades.forEach((g, index) => {
                                    const sem = g.semester || "Unassigned";
                                    if (!grouped[sem]) grouped[sem] = [];
                                    grouped[sem].push({ ...g, index });
                                });
                                const sortedSemesters = Object.keys(grouped).sort((a, b) => {
                                    const numA = parseInt(a.replace(/\D/g, "")) || 0;
                                    const numB = parseInt(b.replace(/\D/g, "")) || 0;
                                    return numA - numB;
                                });
                                return sortedSemesters.length === 0 ? (
                                    <p className="text-gray-500">No past grades added yet</p>
                                ) : (
                                    sortedSemesters.map((semester) => {
                                        const semGrades = grouped[semester];
                                        return (
                                            <div key={semester} className="mb-2 bg-[rgba(202,170,152,0.2)] rounded-xl p-4 flex flex-col gap-4">
                                                <div className="flex items-center justify-between overflow-x-auto gap-2">
                                                    <h2 className="text-lg font-bold text-[rgb(32,41,64)]">{semester}</h2>
                                                    <span className="text-sm text-gray-500">Session {semGrades[0]?.session}</span>
                                                    <button
                                                        onClick={async () => {
                                                            const idsToDelete = semGrades
                                                                .filter((g) => !g.id.toString().startsWith("temp-"))
                                                                .map((g) => g.id);

                                                            if (idsToDelete.length > 0) {
                                                                await supabase
                                                                    .from("past_grades")
                                                                    .delete()
                                                                    .in("id", idsToDelete);
                                                            }

                                                            // Remove from local state
                                                            setGrades(grades.filter((g) => g.semester !== semester));
                                                        }}
                                                        className="cursor-pointer text-red-400 hover:text-red-600 text-xs"
                                                    >
                                                        Delete Semester
                                                    </button>
                                                </div>
                                                        <div className="overflow-x-auto">
                                                <table className="w-full text-sm border-separate border-spacing-x-2 border-spacing-y-2">
                                                    <thead>
                                                        <tr className="text-left text-gray-500 border-b">
                                                            <th className="pb-2">Subject</th>
                                                            <th className="pb-2">Course Code</th>
                                                            <th className="pb-2">Credits</th>
                                                            <th className="pb-2">Marks</th>
                                                            <th className="pb-2">Grade</th>
                                                            <th className="pb-2"></th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {
                                                            semGrades.filter(g => g.courseCode !== "").map((g) => (
                                                                <tr key={g.index} className="border-b border-gray-100">
                                                                    <td className="py2">{g.subjectName}</td>
                                                                    <td className="py-2">{g.courseCode}</td>
                                                                    <td className="py-2">{g.credits}</td>
                                                                    <td className="py-2">{g.marks}</td>
                                                                    <td className="py-2">{g.grade}</td>
                                                                    <td className="py-2">
                                                                        <button
                                                                            onClick={() => removeGrade(g.id)}
                                                                            className="exo text-red-400 hover:text-red-600 text-xs"
                                                                        >
                                                                            Delete
                                                                        </button>
                                                                    </td>
                                                                </tr>
                                                            ))
                                                        }
                                                    </tbody>
                                                </table>
                                                </div>



                                                <div className="flex gap-3 flex-wrap items-center">
                                                    <input
                                                        type="text"
                                                        placeholder="Subject name"
                                                        value={gradeInput[semester]?.subjectName || ""}
                                                        onChange={(e) => handleGradeInput(semester, "subjectName", e.target.value)}
                                                        className="min-w-0 border rounded-lg p-2 text-sm focus:outline-none focus:ring-2 focus:ring-[rgb(75,86,148)]"
                                                    />
                                                    <input
                                                        type="text"
                                                        placeholder="Course Code"
                                                        value={gradeInput[semester]?.courseCode || ""}
                                                        onChange={(e) => handleGradeInput(semester, "courseCode", e.target.value.toUpperCase().replace(/\s/g, ""))}
                                                        className="min-w-0 border rounded-lg p-2 text-sm focus:outline-none focus:ring-2 focus:ring-[rgb(75,86,148)]"
                                                    />
                                                    <input
                                                        type="number"
                                                        step="0.01"
                                                        placeholder="Credits"
                                                        value={gradeInput[semester]?.credits || ""}
                                                        onChange={(e) => handleGradeInput(semester, "credits", e.target.value)}
                                                        className="min-w-0 border rounded-lg p-2 text-sm focus:outline-none focus:ring-2 focus:ring-[rgb(75,86,148)]"
                                                    />

                                                    <input
                                                        type="number"
                                                        step="0.01"
                                                        placeholder="Marks"
                                                        value={gradeInput[semester]?.marks || ""}
                                                        onChange={(e) => handleGradeInput(semester, "marks", e.target.value)}
                                                        className="min-w-0 border rounded-lg p-2 text-sm focus:outline-none focus:ring-2 focus:ring-[rgb(75,86,148)]"
                                                    />
                                                    {/* <input
                                                        type="text"
                                                        placeholder="Grade"
                                                        value={gradeInput[semester]?.grade || ""}
                                                        onChange={(e) => handleGradeInput(semester, "grade", e.target.value)}
                                                        className="border rounded-lg p-2 text-sm focus:outline-none focus:ring-2 focus:ring-[rgb(75,86,148)]"
                                                    /> */}
                                                    <div className="flex gap-2 overflow-x-auto">
                                                    <label for="grades" className="text-gray-500 text-sm">Grade:</label>
                                                    <select name="grades" id="grades" className="text-sm"
                                                    value={gradeInput[semester]?.grade || ""}
                                                    onChange={(e) => handleGradeInput(semester, "grade", e.target.value)}>
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

                                                    <button
                                                        onClick={() => handleSaveGrade(semester, semGrades[0]?.session)}
                                                        disabled={savingGrade === semester}
                                                        className="sniglet-regular cursor-pointer bg-[rgb(75,86,148)] disabled:opacity-50 text-white font-bold px-4 py-2 rounded-lg text-sm hover:bg-[rgb(32,41,64)]"
                                                    >
                                                        {savingGrade === semester ? "Saving..." : "Add"}
                                                    </button>
                                                </div>

                                            </div>
                                        )
                                    })
                                );
                            })()

                        }

                    </div>
                )
            }

            <div>
                <h2 className="text-xl text-[rgb(75,64,56)] space-mono-bold mt-6">Current Predictions</h2>
                <p className="text-[rgb(75,64,56)] my-1">Select a subject to view predicted grades.</p>

                {/* <div className="flex gap-4 overflow-x-auto my-2">
                    {Object.keys(subjects1).map((subject) => (
                        <button
                            key={subject}
                            onClick={() => setSelectedSubject(
                                selectedSubject === subject ? null : subject
                            )}
                            className={`font-bold px-6 py-2 rounded-xl text-lg transition-all duration-100 shadow-sm 
                                ${selectedSubject === subject ?
                                    "bg-[rgb(75,64,56)] text-[rgb(238,238,238)] shadow-md"
                                    : "bg-[rgb(238,238,238)] border-2 border-[rgb(154,134,120)] hover:border-[rgb(75,64,56)] text-[rgb(75,64,56)] hover:bg-[rgb(75,64,56,0.2)] hover:shadow-md"
                                }
                            `}
                        >
                            {subject}
                        </button>
                    ))}
                </div> */}
                {subjects.length === 0 ? (
                    <p className="text-gray-500 mt-2">No subjects found. Please add subjects in your Profile.</p>
                ) : (
                    <div className="flex gap-4 overflow-x-auto my-2">
                        {subjects.map((subject) => (
                            <button
                                key={subject.id}
                                onClick={() => setSelectedSubject(
                                    selectedSubject === subject.course_code ? null : subject.course_code
                                )}
                                className={`sniglet-regular cursor-pointer font-medium px-6 py-2 rounded-xl text-lg transition-all duration-100 shadow-sm
                        ${selectedSubject === subject.course_code ?
                                        "bg-[rgb(75,64,56)] text-[rgb(238,238,238)] shadow-md"
                                        : "bg-[rgb(238,238,238)] border-2 border-[rgb(154,134,120)] hover:border-[rgb(75,64,56)] text-[rgb(75,64,56)] hover:bg-[rgb(75,64,56,0.2)] hover:shadow-md"
                                    }`}
                            >
                                {subject.name}
                            </button>
                        ))}
                    </div>
                )}
                {
                    selectedSubject && (() => {
                        const subject = subjects.find((s) => s.course_code === selectedSubject);
                        const prediction = predictions[selectedSubject];
                        const isPredicting = predicting === selectedSubject;
                        const stats = cohortStats[selectedSubject];
                        if (!stats) return <p className="text-gray-400 text-sm mt-2">Loading...</p>;

                        return (
                            // <SubjectPanel
                            //     subject={selectedSubject}
                            // />
                            <SubjectPanel
                                ranges={computeGradeRanges(stats.cohort_mean, stats.cohort_std, stats.grade_boundaries)}
                                predictedGrade={prediction?.predicted_grade}
                            />
                        )
                    })()
                }
            </div>
            {/* <div>
                <h2 className="text-xl text-[rgb(75,64,56)] font-bold mt-6">Enter expected marks</h2>
                <div className="flex flex-col gap-4 mt-4">
                    {Object.keys(subjects1).map((subject) => (
                        <div key={subject} className="grid grid-cols-3 gap-4 items-center">
                            <label className="text-lg font-medium text-[rgb(75,64,56)]">{subject}</label>
                            <input
                                type="number"
                                min="0"
                                max="100"
                                className="border rounded-lg p-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                placeholder={`Enter expected marks for ${subject}`}
                                onChange={(event) => {
                                    setExpectedMarks({
                                        ...expectedMarks,
                                        [subject]: event.target.value
                                    });
                                }}
                            />
                            <p className="flex rounded-lg justify-center text-lg font-bold text-[rgb(75,64,56)]">{
                                subjects1[subject].find((g) => {
                                    return g.min <= parseInt(expectedMarks[subject]) && g.max >= parseInt(expectedMarks[subject]);
                                })?.grade
                            }</p>
                        </div>
                    ))}
                </div>
            </div>
            <div className="bg-[rgb(202,170,152,0.2)] p-4 mt-6 flex-1 overflow-x-auto rounded-lg">
                <h2 className="text-xl text-[rgb(75,64,56)] font-bold">Improvements</h2>
                <p className="text-gray-500 my-4">No suggestions available.</p>
            </div> */}
        </div>
    )
}

export default Predict;