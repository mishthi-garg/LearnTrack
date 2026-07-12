import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
//import ChatModal from "../components/ChatModal"

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

const allowedTypes = [
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "text/plain",
    "text/markdown",
]; // and image/*
function Tutor({ user }) {
    const navigate = useNavigate();
    const [chatMode, setChatMode] = useState(null); // "subject_tutor" | "study_plan" | null
    const [documents, setDocuments] = useState([]);
    const [uploading, setUploading] = useState(false);
    const [loading, setLoading] = useState(false);
    const fileInputRef = useRef(null);
    const [subjects, setSubjects] = useState([]);
    const [selectedTutorSubject, setSelectedTutorSubject] = useState(null);
    const [currSemester, setCurrSemester] = useState(null);
    const [docSemester, setDocSemester] = useState(null);
    const [selectedSemester, setSelectedSemester] = useState(null);
    const [selectedSubject, setSelectedSubject] = useState(null);
    const [pastSubjects, setPastSubjects] = useState([]);
    const [listSemesters, setListSemesters] = useState(false);
    useEffect(() => {
        if (!user) return;
        const fetchCurrSemester = async () => {
            const { data, error } = await supabase
                .from("profiles")
                .select("semester")
                .eq("id", user.id)
                .single();
            if (error) console.error("Error fetching current semester:", error);
            else setCurrSemester(data.semester);
        }
        fetchCurrSemester();
    }, [user]);
    useEffect(() => {
        if (!user) return;
        const fetchPastSubjects = async () => {
            const { data, error } = await supabase
                .from("past_grades")
                .select("*")
                .eq("user_id", user.id);
            if (error) console.error("Error fetching past subjects:", error);
            else setPastSubjects(data);
        }
        fetchPastSubjects();
    }, [user]);
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
        if (!user || !selectedSubject) return;
        const fetchDocuments = async (courseCode) => {
            setLoading(true);
            const { data, error } = await supabase
                .from("documents")
                .select("*")
                .eq("user_id", user.id)
                .eq("course_code", courseCode)
                .order("uploaded_at", { ascending: false });
            if (error) console.error("Error fetching documents:", error);
            else {
                const withUrls = await Promise.all(
                    data.map(async (doc) => {
                        const { data: signed } = await supabase.storage
                            .from("documents")
                            .createSignedUrl(doc.file_path, 60 * 60 * 24 * 30);
                        return { ...doc, file_url: signed?.signedUrl };
                    })
                );
                setDocuments(withUrls);
            };
            setLoading(false);
        }
        fetchDocuments(selectedSubject);
    }, [user, selectedSubject]);

    const handleAddClick = () => fileInputRef.current.click();

    const handleFileChange = async (e) => {
        const file = e.target.files[0];
        e.target.value = "";
        if (!file) return;

        if (
            !allowedTypes.includes(file.type) &&
            !file.type.startsWith("image/")
        ) {
            alert("Unsupported file type.");
            return;
        }

        try {
            // const filePath = `${user.id}/${selectedSubject}/${Date.now()}_${file.name}`;
            // const { data, error: uploadError } = await supabase.storage
            //     .from("documents")
            //     .upload(filePath, file);

            // if (uploadError) throw uploadError;

            const formData = new FormData();
            formData.append("file", file);
            formData.append("userId", user.id);
            formData.append("courseCode", selectedSubject);
            formData.append("semester", docSemester);
            setUploading(true);
            const res = await fetch(`${BACKEND_URL}/api/upload`, {
                method: "POST",
                body: formData, // no Content-Type header — browser sets multipart boundary automatically
            });

            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.error || "Upload failed");
            }
            setUploading(false);

            const { document: inserted } = await res.json();

            const { data: signed, error: signError } = await supabase.storage
                .from("documents")
                .createSignedUrl(inserted.file_path, 60 * 60 * 24 * 30); // 30 days

            if (signError) throw signError;

            // const { data: inserted, error: insertError } = await supabase
            //     .from("documents")
            //     .insert({
            //         user_id: user.id,
            //         course_code: selectedSubject,
            //         file_name: file.name,
            //         semester: docSemester,
            //         type: file.type,
            //         file_path: filePath,
            //     })
            //     .select()
            //     .single();

            // if (insertError) throw insertError;

            setDocuments((prev) => [
                { ...inserted, file_url: signed?.signedUrl },
                ...prev,
            ]);
        } catch (err) {
            console.error("Upload failed:", err);
            alert("Failed to upload document.");
        } finally {
            setUploading(false);
        }
    };

    const handleDelete = async (doc) => {
        if (!confirm(`Delete "${doc.file_name}"?`)) return;
        try {
            const path = doc.file_path;
            const { error: storageError } = await supabase.storage
                .from("documents")
                .remove([path]);

            if (storageError) throw storageError;

            const { error: dbError } = await supabase
                .from("documents")
                .delete()
                .eq("id", doc.id);

            if (dbError) throw dbError;

            setDocuments((prev) => prev.filter((d) => d.id !== doc.id));

        } catch (err) {
            console.error("Delete failed:", err);
            alert("Failed to delete document.");
        }
    };

    const openSubjectTutor = (sub) => {
        console.log("sending this:", subjects.find(s => s.course_code === sub));
         navigate(`/chat/subject_tutor`, {
      state: {
        subject: subjects.find(s => s.course_code === sub),
        semester: currSemester,
      },
    });
    };

    const openStudyPlan = () => {
         navigate(`/chat/study_plan`);
    };

    const grouped = {};
    pastSubjects.forEach((g, index) => {
        const sem = g.semester || "Unassigned";
        if (!grouped[sem]) grouped[sem] = [];
        grouped[sem].push({ ...g, index });
    });
    const sortedSemesters = Object.keys(grouped).sort((a, b) => {
        const numA = parseInt(a.replace(/\D/g, "")) || 0;
        const numB = parseInt(b.replace(/\D/g, "")) || 0;
        return numA - numB;
    });

    return (
        <div className="flex flex-col gap-6">
            <h1 className="cause text-3xl font-bold text-[rgb(32,41,64)]">Tutor</h1>
            <div className="rounded-lg p-4 bg-[rgb(202,170,152,0.2)] max-h-72 overflow-y-auto">

                <div className="py-2 flex gap-3 items-center justify-between">
                    <h2 className="text-xl space-mono-bold text-[rgb(75,64,56)]">Reference Notes</h2>

                    <button
                        onClick={handleAddClick}
                        disabled={uploading || !selectedSubject}
                        className="disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer min-w-0 bg-[rgb(75,86,148)] text-white text-sm font-bold sniglet-regular px-4 py-2 rounded-lg hover:bg-[rgb(32,41,64)]"
                    >
                        {uploading ? "Uploading..." : "Upload"}
                    </button>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept={allowedTypes.join(",") + ",image/*"}
                        className="hidden"
                        onChange={handleFileChange}
                    />
                </div>
                <p className="text-[rgb(32,41,64)] italic text-sm">Select a subject to upload documents.</p>
                <button
                    onClick={() => {
                        setListSemesters(!listSemesters);
                        setSelectedSemester(null);
                        setSelectedSubject(null);
                    }

                    }
                    className="italic bg-yellow-50 cursor-pointer shadow-sm text-yellow-800 text-xs mt-2 rounded-full px-4 py-0.25">
                    {listSemesters ? "click to see current subjects" : "click to see older subjects"
                    }
                </button>
                {listSemesters && (
                    <div className="flex gap-4 my-4">
                        {
                            sortedSemesters.length === 0 ? (
                                <p className="text-gray-500">No past grades added yet</p>
                            ) : (
                                sortedSemesters.map((semester) => {
                                    return (
                                        <button key={semester}
                                            className={`px-6 py-1 rounded-full shadow-sm text-xs transition-all duration-200
                                        ${selectedSemester === semester ?
                                                    "bg-[rgb(75,64,56)] border border-[rgb(75,64,56)] text-[rgb(238,238,238)]"
                                                    : "border border-[rgb(75,64,56)] bg-[rgb(238,238,238)] text-[rgb(75,64,56)] hover:bg-yellow-50"
                                                }`}
                                            onClick={() => {
                                                setSelectedSemester(
                                                    selectedSemester === semester ? null : semester
                                                );
                                                setSelectedSubject(null);
                                            }}
                                        >{semester}</button>


                                    )
                                }

                                )
                            )

                        }
                    </div>
                )}
                {listSemesters && selectedSemester && (
                    <div className="flex gap-4 my-4 flex-wrap">
                        {grouped[selectedSemester].map((subject) => (
                            <button
                                key={subject.id}
                                onClick={() => {
                                    setSelectedSubject(
                                        selectedSubject === subject.course_code
                                            ? null
                                            : subject.course_code
                                    );
                                    setDocSemester(subject.semester);
                                }
                                }
                                className={`px-6 py-1 rounded-full text-xs transition-all duration-400
                    ${selectedSubject === subject.course_code
                                        ? "bg-[rgb(32,41,64)] border border-[rgb(32,41,64)] text-[rgb(238,238,238)]"
                                        : "border border-[rgb(32,41,64)] text-[rgb(32,41,64)] hover:bg-yellow-50"
                                    }`}
                            >
                                {subject.subject_name}
                            </button>
                        ))}
                    </div>
                )}
                {subjects.length === 0 ? (
                    <p className="text-gray-500 mt-2">No subjects found. Please add subjects in your Profile.</p>
                ) : (!listSemesters && (
                    <div className="flex gap-4 my-4 overflow-x-auto">
                        {subjects.map((subject) => {
                            return (
                                <button
                                    key={subject.id}
                                    onClick={() => {
                                        setSelectedSubject(
                                            selectedSubject === subject.course_code ? null : subject.course_code
                                        );
                                        setDocSemester(currSemester);
                                    }}
                                    className={`px-6 py-1 rounded-full text-xs transition-all duration-400
                        ${selectedSubject === subject.course_code ?
                                            "bg-[rgb(32,41,64)] border border-[rgb(32,41,64)] text-[rgb(238,238,238)]"
                                            : "border border-[rgb(32,41,64)] text-[rgb(32,41,64)] hover:bg-yellow-50"
                                        }`}
                                >
                                    {subject.name}
                                </button>
                            )
                        })}
                    </div>
                )
                )}
                <div className="p-4 text-sm flex flex-col items-start gap-3">
                    {loading ? (
                        <p className="text-gray-500">Loading...</p>
                    ) : documents.length === 0 ? (
                        <p className="text-gray-500">No documents uploaded</p>
                    ) : (
                        documents.map((doc) => (
                            <div
                                key={doc.id}
                                className="flex items-center justify-between w-full bg-[rgb(238,238,238)] rounded-lg px-3 py-2"
                            >
                                <a
                                    href={doc.file_url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="truncate text-[rgb(75,86,148)] hover:underline"
                                >
                                    {doc.file_name}
                                </a>
                                <button
                                    onClick={() => handleDelete(doc)}
                                    className="text-red-500 hover:text-red-700 ml-3"
                                >
                                    Delete
                                </button>
                            </div>
                        ))
                    )}
                </div>
            </div>

            <div>
                <h2 className="space-mono-bold text-xl text-[rgb(75,64,56)] mt-6">Choose a Subject to Study</h2>
                {/* <div className="flex gap-4 mt-4">
                    <button className="bg-[rgb(75,86,148)] text-white px-4 py-2 rounded-lg hover:bg-[rgb(32,41,64)] cursor-pointer">
                        Data Structures
                    </button>
                    <button className="bg-[rgb(75,86,148)] text-white px-4 py-2 rounded-lg hover:bg-[rgb(32,41,64)] cursor-pointer">
                        Algorithms
                    </button>
                    <button className="bg-[rgb(75,86,148)] text-white px-4 py-2 rounded-lg hover:bg-[rgb(32,41,64)] cursor-pointer">
                        Machine Learning
                    </button>
                </div> */}
                {subjects.length === 0 ? (
                    <p className="text-gray-500 mt-2">No subjects found. Please add subjects in your Profile.</p>
                ) : (
                    <div className="flex gap-4 mt-4 overflow-x-auto">
                        {subjects.map((subject) => {
                            return (
                                <button
                                    key={subject.id}
                                    onClick={() => {
                                        setSelectedTutorSubject(
                                            selectedTutorSubject === subject.course_code ? null : subject.course_code
                                        );
                                        openSubjectTutor(subject.course_code);
                                    }}
                                    className={`sniglet-regular cursor-pointer font-medium px-6 py-2 rounded-lg text-lg transition-all duration-100 shadow-sm
                        ${selectedTutorSubject === subject.course_code ?
                                            "bg-[rgb(75,64,56)] text-[rgb(238,238,238)] shadow-md"
                                            : "bg-[rgb(238,238,238)] border-2 border-[rgb(154,134,120)] hover:border-[rgb(75,64,56)] text-[rgb(75,64,56)] hover:bg-[rgb(75,64,56,0.2)] hover:shadow-md"
                                        }`}
                                >
                                    {subject.name}
                                </button>
                            )
                        })}
                    </div>
                )}

            </div>
            <div>
                <h2 className="text-xl space-mono-bold text-[rgb(75,64,56)] mt-6">Need help with study planning?</h2>
                <button 
                onClick={openStudyPlan}
                className="sniglet-regular mt-4 bg-[rgb(75,86,148)] text-white px-4 py-2 rounded-lg hover:bg-[rgb(32,41,64)] cursor-pointer">
                    Let's Chat!
                </button>
            </div>
{/* {chatMode && (
    <ChatModal 
        mode={chatMode}
        subject={subjects.find(s => s.course_code === selectedTutorSubject)}
        semester={currSemester}
        userId={user.id}
        onClose={() => setChatMode(null)}
    />
)} */}
        </div>
    )
}

export default Tutor;