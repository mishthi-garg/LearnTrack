import { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";


function Profile({user}){
    const [name, setName] = useState("");
    const [roll, setRoll] = useState("");
    const [branch,setBranch] = useState("");
    const [batch, setBatch] = useState("");
    const [college, setCollege] = useState("");
    const [subjects, setSubjects] = useState([{name: "", credits: ""}]);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState("");
    
    useEffect(()=>{
        if(!user) return;

        const fetchProfile = async () => {
            const { data, error } = await supabase
                .from("profiles")
                .select("*")
                .eq("id", user.id)
                .single();

            if (data){
                setName(data.name || "");
                setRoll(data.roll_no || "");
                setBranch(data.branch || "");
                setBatch(data.batch || "");
                setCollege(data.college || "");
            }
        };

        const fetchSubjects = async()=>{
            const { data, error } = await supabase
                .from("subjects")
                .select("*")
                .eq("user_id", user.id);
            if (data && data.length > 0){
                setSubjects(data.map((s)=> ({name: s.name || "", credits: s.credits || ""})));
            }
        };

        fetchProfile();
        fetchSubjects();
    }, [user]);


    const addSubject = () => {
        setSubjects([...subjects, {name: "", credits: ""}]);
    };

    const updateSubject = (index, field, value) => {
        const updated = [...subjects];
        updated[index][field] = value;
        setSubjects(updated);
    };

    const removeSubject = (index) => {
        setSubjects(subjects.filter((_, i) => i !== index));
    };

    const handleSave = async ()=>{
        setSaving(true);
        setMessage("");

        const {error: profileError} = await supabase
            .from("profiles")
            .upsert({
                id: user.id,
                name,
                roll_no: roll,
                branch,
                batch,
                college,
            });
        if(profileError){
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
            .map((s)=>({user_id: user.id, name: s.name, credits: parseFloat(s.credits) || 0}));
        
        if(subjectRows.length > 0){
            const {error: subjectError} = await supabase
                .from("subjects")
                .insert(subjectRows);
            if(subjectError){
                console.error("Error saving subjects: ", subjectError);
                setMessage("Error saving subjects");
                setSaving(false);
                return
            }
        }

        setMessage("Profile saved successfully!");
        setSaving(false);
    };

    return(
        <div>
            <h1 className="text-2xl font-bold text-[rgb(32,41,64)]">Edit Profile</h1>
            <div className="flex flex-col gap-4 mt-6">
                <div className="flex items-center">
                    <label className="text-lg font-medium">Name:</label>
                    <input
                        value={name}
                        type="text"
                        onChange = {
                            (event) =>{
                               setName(event.target.value)
                            }
                        }
                        className="ml-4 border rounded-lg p-2 focus:ring-2 focus:ring-[rgb(32,41,64)] focus:outline-none"
                        placeholder="Enter your name"
                    />
                </div>

                <div className="flex items-center">
                    <label className="text-lg font-medium">Roll Number:</label>
                    <input
                        value= {roll}
                        type="text"
                        onChange = {
                            (event) =>{
                                setRoll(event.target.value)
                            }
                        }
                        className="ml-4 border rounded-lg p-2 focus:ring-2 focus:ring-[rgb(32,41,64)] focus:outline-none"
                        placeholder="Enter your roll number"
                    />
                </div>

                <div className="flex items-center">
                    <label className="text-lg font-medium">Branch:</label>
                    <input
                        value ={branch}
                        type="text"
                        onChange = {
                            (event) =>{
                                setBranch(event.target.value)
                            }
                        }
                        className="ml-4 border rounded-lg p-2 focus:ring-2 focus:ring-[rgb(32,41,64)] focus:outline-none"
                        placeholder="Enter your branch"
                    />
                </div>

                <div className="flex items-center">
                    <label className="text-lg font-medium">Batch:</label>
                    <input
                        value ={batch}
                        type="text"
                        onChange = {
                            (event) =>{
                                setBatch(event.target.value)
                            }
                        }
                        className="ml-4 border rounded-lg p-2 focus:ring-2 focus:ring-[rgb(32,41,64)] focus:outline-none"
                        placeholder="Enter your branch"
                    />
                </div>

                <div className="flex items-center">
                    <label className="text-lg font-medium">College:</label>
                    <input
                        value ={college}
                        type="text"
                        onChange = {
                            (event) =>{
                                setCollege(event.target.value)
                            }
                        }
                        className="ml-4 border rounded-lg p-2 focus:ring-2 focus:ring-[rgb(32,41,64)] focus:outline-none"
                        placeholder="Enter your branch"
                    />
                </div>

                {subjects.map((subject,index)=>(
                <div 
                    key={index}
                    className="flex items-center">
                    <label className="text-lg font-medium">Subject {index + 1}:</label>
                    <input
                        type="text"
                        value={subject.name}
                        onChange = {
                            (event) => {
                                updateSubject(index, "name", event.target.value)    
                            }
                        }
                        className="ml-4 border rounded-lg p-2 focus:ring-2 focus:ring-[rgb(32,41,64)] focus:outline-none"
                        placeholder={`Enter subject ${index + 1}`}
                    />
                    <input
                        type="text"
                        value={subject.credits}
                        onChange = {
                            (event) => {
                                updateSubject(index, "credits", event.target.value)    
                            }
                        }
                        className="ml-4 border rounded-lg p-2 focus:ring-2 focus:ring-[rgb(32,41,64)] focus:outline-none"
                        placeholder={`Enter subject ${index + 1} credits`}
                    />
                    {subjects.length > 1 && (
                            <button
                                onClick={() => removeSubject(index)}
                                className="ml-4 text-red-600 hover:text-red-400 font-bold text-lg"
                            >
                                Delete
                            </button>
                        )}
                </div>
                )
       ) }
                
                <div className="flex justify-center">
                <button 
                    onClick={addSubject}
                    className="text-[rgb(75,64,56)] hover:font-bold cursor-pointer">
                        Click to add more subjects
                </button>
                </div>
            </div>

            {
                message && (
                    <p className={message.includes("Error") ? "text-red-500" : "text-green-600"}>
                        {message}
                    </p>
                )
            }

            <button
                onClick = {handleSave}
                disabled={saving}
                className="mt-2 disabled:opacity-50 bg-[rgb(75,86,148)] text-white font-bold py-2 px-4 rounded-lg hover:bg-[rgb(32,41,64)]">
                {
                    saving? "Saving..." : "SAVE"
                }
            </button>
        </div>
    );
}

export default Profile;