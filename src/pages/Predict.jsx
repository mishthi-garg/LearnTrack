import { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";

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

function SubjectPanel({ subject }) {
    const ranges = subjects1[subject];


    return (
        <div className="my-4 flex items-center justify-center">
            <div className="border-2 border-[rgb(75,64,56)] bg-[rgb(238,238,238)] rounded-2xl shadow-xl p-6 overflow-x-auto">

                <div className="flex gap-2">
                    {ranges.map((g) => (
                        <div
                            key={g.grade}
                            className={`flex gap-4 items-center justify-between px-4 py-3 rounded-lg bg-[rgb(202,170,152,0.2)] text-[rgb(75,64,56)]`}
                        >
                            <span className="font-bold text-lg">{g.grade}</span>
                            <span className="text-sm">{g.min} – {g.max} marks</span>
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
            <h1 className="text-2xl font-bold text-[rgb(32,41,64)]">Predict</h1>
            <div className="flex gap-4 mt-4">
                <button className={`text-white px-4 py-2 rounded-lg hover:bg-[rgb(32,41,64)] cursor-pointer
                    ${
                        viewMarks === "current" ? "bg-[rgb(32,41,64)]" : "bg-[rgb(75,86,148)]"
                    }`}
                    onClick={()=>{
                        viewMarks === "current" ? setViewMarks("") : setViewMarks("current");
                    }}
                >
                    Current Marks Till Now
                </button>
                <button className={`text-white px-4 py-2 rounded-lg hover:bg-[rgb(32,41,64)] cursor-pointer
                    ${
                        viewMarks === "past" ? "bg-[rgb(32,41,64)]" : "bg-[rgb(75,86,148)]"
                    }`}
                    onClick={()=>{
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
                                    <h2 className="text-lg font-bold text-[rgb(32,41,64)]">{subject.name}</h2>
                                    <span className="text-sm text-gray-500">{subject.course_code} | {subject.credits} credits</span>
                                </div>

                                {
                                    marks[subject.course_code] && marks[subject.course_code].length > 0 && (
                                        <table className="w-full text-sm">
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
                                                            <td className="py2">{m.exam_type}</td>
                                                            <td className="py-2">{m.marks_scored}</td>
                                                            <td className="py-2">{m.max_marks}</td>
                                                            <td className="py-2">{m.weightage}</td>
                                                            <td className="py-2">
                                                                <button
                                                                    onClick={() => handleDeleteMark(m.id, subject.course_code)}
                                                                    className="text-red-400 hover:text-red-600 text-xs"
                                                                >
                                                                    Delete
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    ))
                                                }
                                            </tbody>
                                        </table>
                                    )
                                }

                                <div className="flex gap-3 flex-wrap items-center">
                                    <input
                                        type="text"
                                        placeholder="Exam type (e.g. Mid1)"
                                        value={inputs[subject.course_code]?.exam_type || ""}
                                        onChange={(e) => handleInputChange(subject.course_code, "exam_type", e.target.value)}
                                        className="border rounded-lg p-2 text-sm focus:outline-none focus:ring-2 focus:ring-[rgb(75,86,148)]"
                                    />
                                    <input
                                        type="number"
                                        step="0.01"
                                        placeholder="Marks scored"
                                        value={inputs[subject.course_code]?.marks_scored || ""}
                                        onChange={(e) => handleInputChange(subject.course_code, "marks_scored", e.target.value)}
                                        className="border rounded-lg p-2 text-sm focus:outline-none focus:ring-2 focus:ring-[rgb(75,86,148)]"
                                    />
                                    <input
                                        type="number"
                                        step="0.01"
                                        placeholder="Maximum marks"
                                        value={inputs[subject.course_code]?.max_marks || ""}
                                        onChange={(e) => handleInputChange(subject.course_code, "max_marks", e.target.value)}
                                        className="border rounded-lg p-2 text-sm focus:outline-none focus:ring-2 focus:ring-[rgb(75,86,148)]"
                                    />
                                    <input
                                        type="number"
                                        step="0.01"
                                        placeholder="Weightage"
                                        value={inputs[subject.course_code]?.weightage || ""}
                                        onChange={(e) => handleInputChange(subject.course_code, "weightage", e.target.value)}
                                        className="border rounded-lg p-2 text-sm focus:outline-none focus:ring-2 focus:ring-[rgb(75,86,148)]"
                                    />
                                    <button
                                        onClick={() => handleAddMarks(subject)}
                                        disabled={saving === subject.course_code}
                                        className="bg-[rgb(75,86,148)] disabled:opacity-50 text-white font-bold px-4 py-2 rounded-lg text-sm hover:bg-[rgb(32,41,64)]"
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

            <div>
                <h2 className="text-xl text-[rgb(75,64,56)] font-bold mt-6">Current Predictions</h2>
                <p className="text-[rgb(75,64,56)] my-1">Select a subject to view predicted grades.</p>

                <div className="flex gap-4 overflow-x-auto my-2">
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
                </div>

                {
                    selectedSubject && (
                        <SubjectPanel
                            subject={selectedSubject}
                        />
                    )
                }
            </div>
            <div>
                <h2 className="text-xl text-[rgb(75,64,56)] font-bold mt-6">Enter expected marks</h2>
                <div className="flex flex-col gap-4 mt-4">
                    {Object.keys(subjects1).map((subject) => (
                        <div className="grid grid-cols-3 gap-4 items-center">
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
            </div>
        </div>
    )
}

export default Predict;