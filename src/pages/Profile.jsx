import { useState } from "react";


function Profile(){
    const [name, setName] = useState("Mishthi Garg");
    const [roll, setRoll] = useState("24UCC126");
    const [email,setEmail] = useState("24ucc126@lnmiit.ac.in");
    const [subjects, setSubjects] = useState([""]);
    
    const [newName, setNewName] = useState(name);
    const [newRoll, setNewRoll] = useState(roll);
    const [newEmail,setNewEmail] = useState(email);
    const [newSubjects, setNewSubjects] = useState(subjects);
    
    const addSubject = () => {
        setSubjects([...subjects, ""]);
    };

    const removeSubject = (index) => {
        setSubjects(subjects.filter((_, i) => i !== index));
    };

    console.log(subjects);

    return(
        <div>
            <h1 className="text-2xl font-bold text-blue-600">Edit Profile</h1>
            <div className="flex flex-col gap-4 mt-6">
                <div className="flex items-center">
                    <label className="text-lg font-medium">Name:</label>
                    <input
                        value={newName}
                        type="text"
                        onChange = {
                            (event) =>{
                               setNewName(event.target.value)
                            }
                        }
                        className="ml-4 border rounded-lg p-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        placeholder="Enter your name"
                    />
                </div>

                <div className="flex items-center">
                    <label className="text-lg font-medium">Roll Number:</label>
                    <input
                        value= {newRoll}
                        type="text"
                        onChange = {
                            (event) =>{
                                setNewRoll(event.target.value)
                            }
                        }
                        className="ml-4 border rounded-lg p-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        placeholder="Enter your roll number"
                    />
                </div>

                <div className="flex items-center">
                    <label className="text-lg font-medium">Email:</label>
                    <input
                        value ={newEmail}
                        type="email"
                        onChange = {
                            (event) =>{
                                setNewEmail(event.target.value)
                            }
                        }
                        className="ml-4 border rounded-lg p-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        placeholder="Enter your email"
                    />
                </div>
                {subjects.map((_,index)=>(
                <div 
                    key={index}
                    className="flex items-center">
                    <label className="text-lg font-medium">Subject {index + 1}:</label>
                    <input
                        type="text"
                        value={newSubjects[index]}
                        onChange = {
                            (event) => {
                                const updated = [...subjects];
                                updated[index] = event.target.value;
                                setNewSubjects(updated);
                            }
                        }
                        className="ml-4 border rounded-lg p-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        placeholder={`Enter subject ${index + 1}`}
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
                    className="text-blue-900 hover:font-bold cursor-pointer">Click to add more subjects</button>
                </div>
            </div>
            <button
                onClick = {()=>{
                    setName(newName);
                    setRoll(newRoll);
                    setEmail(newEmail);
                    setSubjects(newSubjects);
                }}
                className="bg-blue-600 font-bold text-white py-2 px-4 rounded-lg hover:bg-blue-700">SAVE</button>
        </div>
    )
}

export default Profile;