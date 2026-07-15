import { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import ChangeSemesterModal from "../components/ChangeSemesterModal"

function Profile({ user }) {
    const [logoutLoading, setLogoutLoading] = useState(false);

    const [name, setName] = useState("");
    const [roll, setRoll] = useState("");
    const [branch, setBranch] = useState("");
    const [batch, setBatch] = useState("");
    const [college, setCollege] = useState("");
    const [semester, setSemester] = useState("");
    const [subjects, setSubjects] = useState([{ name: "", credits: "", code: "" }]);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState("");

    const [showSemesterModal, setShowSemesterModal] = useState(false);

    useEffect(() => {
        if (!user) return;

        const fetchProfile = async () => {
            const { data, error } = await supabase
                .from("profiles")
                .select("*")
                .eq("id", user.id)
                .single();

            if (data) {
                setName(data.name || "");
                setRoll(data.roll_no || "");
                setBranch(data.branch || "");
                setBatch(data.batch || "");
                setCollege(data.college || "");
                setSemester(data.semester || "");
            }
        };

        const fetchSubjects = async () => {
            const { data, error } = await supabase
                .from("subjects")
                .select("*")
                .eq("user_id", user.id);
            if (data && data.length > 0) {
                setSubjects(data.map((s) => ({ name: s.name || "", credits: s.credits || "", code: s.course_code })));
            }
        };

        fetchProfile();
        fetchSubjects();
    }, [user]);

    const handleLogout = async () => {
        setLogoutLoading(true);
        await supabase.auth.signOut();
    }

    const addSubject = () => {
        setSubjects([...subjects, { name: "", credits: "", code: "" }]);
    };

    const updateSubject = (index, field, value) => {
        const updated = [...subjects];
        updated[index][field] = value;
        setSubjects(updated);
    };

    const removeSubject = (index) => {
        setSubjects(subjects.filter((_, i) => i !== index));
    };

    const handleSave = async () => {
        setSaving(true);
        setMessage("");

        const { error: profileError } = await supabase
            .from("profiles")
            .upsert({
                id: user.id,
                name,
                roll_no: roll,
                branch,
                batch,
                college,
                semester,
            });
        if (profileError) {
            console.error("Error saving profile: ", profileError);
            setMessage("Error saving profile.");
            setSaving(false);
            return;
        }

        await supabase
            .from("subjects")
            .delete()
            .eq("user_id", user.id);

        const subjectRows = subjects
            .filter((s) => s.name.trim() != "")
            .map((s) => ({ user_id: user.id, name: s.name, credits: parseFloat(s.credits) || 0, course_code: s.code }));

        if (subjectRows.length > 0) {
            const { error: subjectError } = await supabase
                .from("subjects")
                .insert(subjectRows);
            if (subjectError) {
                console.error("Error saving subjects: ", subjectError);
                setMessage("Error saving subjects");
                setSaving(false);
                return
            }
        }

        setMessage("Profile saved successfully!");
        setSaving(false);
    };

    const handleSemesterComplete = async () => {
        const nextSemNumber = (parseInt(semester.replace(/\D/g, "")) || 0) + 1;
        const nextSemester = `SEM${nextSemNumber}`;

        await supabase
            .from("profiles")
            .update({ semester: nextSemester })
            .eq("id", user.id);
        setSubjects([{ name: "", credits: "", code: "" }]);
        setSemester(nextSemester);
        setShowSemesterModal(false);
        setMessage("Semester changed successfully!");
    }

    return (
        <div className="flex flex-col gap-6">
            <h1 className="cause text-3xl font-bold text-[rgb(32,41,64)]">Profile</h1>
            <div className="flex flex-col md:flex-row gap-4">
                {/* info */}
                <div className="bg-[rgb(202,170,152,0.2)] p-4 rounded-lg flex flex-col gap-4">
                    <h2 className="text-xl text-[rgb(75,64,56)] space-mono-bold">Personal Details</h2>

                    <div className="flex items-center gap-4">
                        <label className="text-md font-medium">Name:</label>
                        <input
                            value={name}
                            type="text"
                            onChange={
                                (event) => {
                                    setName(event.target.value)
                                }
                            }
                            className="text-sm border border-gray-400 rounded-lg p-2 focus:ring-2 focus:ring-[rgb(32,41,64)] focus:outline-none"
                            placeholder="Enter your name"
                        />
                    </div>

                    <div className="flex items-center gap-4">
                        <label className="text-md font-medium">Roll Number:</label>
                        <input
                            value={roll}
                            type="text"
                            onChange={
                                (event) => {
                                    setRoll(event.target.value)
                                }
                            }
                            className="border-gray-400 text-sm border rounded-lg p-2 focus:ring-2 focus:ring-[rgb(32,41,64)] focus:outline-none"
                            placeholder="Enter your roll number"
                        />
                    </div>

                    <div className="flex items-center gap-4">
                        <label className="text-md font-medium">Branch:</label>
                        <input
                            value={branch}
                            type="text"
                            onChange={
                                (event) => {
                                    setBranch(event.target.value)
                                }
                            }
                            className="border-gray-400 text-sm border rounded-lg p-2 focus:ring-2 focus:ring-[rgb(32,41,64)] focus:outline-none"
                            placeholder="Enter your branch"
                        />
                    </div>

                    <div className="flex items-center gap-4">
                        <label className="text-md font-medium">Current Semester:</label>
                        <input
                            value={semester}
                            type="text"
                            onChange={(e) => setSemester(e.target.value.toUpperCase().replace(/\s/g, ""))}
                            className="border-gray-400 text-sm border rounded-lg p-2 focus:ring-2 focus:ring-[rgb(32,41,64)] focus:outline-none"
                            placeholder="Enter your semester"
                        />
                    </div>

                    <div className="flex items-center gap-4">
                        <label className="text-md font-medium">Batch:</label>
                        <input
                            value={batch}
                            type="text"
                            onChange={
                                (event) => {
                                    setBatch(event.target.value)
                                }
                            }
                            className="border-gray-400 text-sm border rounded-lg p-2 focus:ring-2 focus:ring-[rgb(32,41,64)] focus:outline-none"
                            placeholder="Enter your branch"
                        />
                    </div>

                    <div className="flex items-center gap-4">
                        <label className="text-md font-medium">College:</label>
                        <input
                            value={college}
                            type="text"
                            onChange={
                                (event) => {
                                    setCollege(event.target.value)
                                }
                            }
                            className="border-gray-400 text-sm border rounded-lg p-2 focus:ring-2 focus:ring-[rgb(32,41,64)] focus:outline-none"
                            placeholder="Enter your branch"
                        />
                    </div>
                </div>
                {/* subjects */}
                <div className="bg-[rgb(202,170,152,0.2)] p-4 rounded-lg flex flex-col gap-4 overflow-y-auto max-h-130">
                    <h2 className="text-xl text-[rgb(75,64,56)] space-mono-bold">Subjects</h2>
                    {subjects.map((subject, index) => (
                        <div
                            key={index}
                            className="flex md:items-center flex-col md:flex-row gap-4">
                            <label className="text-md font-medium">Subject {index + 1}:</label>
                            <div className="flex flex-col lg:flex-row gap-2">
                                <div className="flex flex-col md:flex-row gap-2">
                                    <input
                                        type="text"
                                        value={subject.name}
                                        onChange={
                                            (event) => {
                                                updateSubject(index, "name", event.target.value)
                                            }
                                        }
                                        className="border border-gray-400 text-sm rounded-lg p-2 focus:ring-2 focus:ring-[rgb(32,41,64)] focus:outline-none"
                                        placeholder={`Enter subject ${index + 1}`}
                                    />
                                    <input
                                        type="text"
                                        value={subject.credits}
                                        onChange={
                                            (event) => {
                                                updateSubject(index, "credits", event.target.value)
                                            }
                                        }
                                        className="border border-gray-400 text-sm  rounded-lg p-2 focus:ring-2 focus:ring-[rgb(32,41,64)] focus:outline-none"
                                        placeholder={`Enter subject ${index + 1} credits`}
                                    />
                                </div>
                                <input
                                    type="text"
                                    value={subject.code}
                                    onChange={
                                        (event) => {
                                            updateSubject(index, "code", event.target.value.toUpperCase().replace(/\s/g, ""))
                                        }
                                    }
                                    className="border border-gray-400 text-sm  rounded-lg p-2 focus:ring-2 focus:ring-[rgb(32,41,64)] focus:outline-none"
                                    placeholder={`Enter course code`}
                                />
                            </div>
                            {subjects.length > 1 && (
                                <button
                                    onClick={() => removeSubject(index)}
                                    className="exo cursor-pointer text-red-600 hover:text-red-400 text-sm"
                                >
                                    Delete
                                </button>
                            )}
                        </div>
                    )
                    )}
                    <div className="flex justify-center">
                        <button
                            onClick={addSubject}
                            className="exo text-[rgb(75,64,56)] hover:font-bold cursor-pointer">
                            Click to add more subjects
                        </button>
                    </div>
                </div>



            </div>

            {
                message && (
                    <p className={message.includes("Error") ? "text-red-500" : "text-green-600"}>
                        {message}
                    </p>
                )
            }
            <div className="flex gap-2 items-center justify-center">
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="sniglet-regular cursor-pointer disabled:opacity-50 bg-[rgb(75,86,148)] text-white font-bold py-2 px-4 rounded-lg hover:bg-[rgb(32,41,64)]">
                    {
                        saving ? "Saving..." : "Save"
                    }
                </button>
                <button
                    onClick={() => setShowSemesterModal(true)}
                    className="sniglet-regular cursor-pointer disabled:opacity-50 bg-[rgb(75,86,148)] text-white font-bold py-2 px-4 rounded-lg hover:bg-[rgb(32,41,64)]"
                >
                    Upgrade Semester
                </button>
                <button onClick={() => { handleLogout(); }} disabled={logoutLoading}
                    className="sniglet-regular disabled:opacity-50 cursor-pointer bg-yellow-50 text-yellow-800 font-bold px-4 py-2 rounded-lg hover:bg-[rgb(75,64,56,0.2)]">
                    {logoutLoading ? "Logging Out..." : "Logout"}
                </button>
            </div>
            {
                showSemesterModal && (
                    <ChangeSemesterModal
                        user={user}
                        currentSemester={semester}
                        subjects={subjects.map((s) => ({
                            name: s.name,
                            credits: s.credits,
                            course_code: s.code
                        }))}
                        onClose={() => setShowSemesterModal(false)}
                        onComplete={handleSemesterComplete}
                    />
                )
            }
        </div>
    );
}

export default Profile;