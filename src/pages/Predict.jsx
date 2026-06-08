import { useState } from "react";

const subjects = {
    OS: [
        { grade: "A", min: 88, max: 100, color: "bg-green-500" },
        { grade: "AB", min: 78, max: 87, color: "bg-green-400" },
        { grade: "BC", min: 68, max: 77, color: "bg-yellow-400" },
        { grade: "C", min: 55, max: 67, color: "bg-yellow-500" },
        { grade: "CD", min: 45, max: 54, color: "bg-orange-400" },
        { grade: "D", min: 33, max: 44, color: "bg-orange-600" },
        { grade: "F", min: 0, max: 32, color: "bg-red-500" },
    ],
    ESIOT: [
        { grade: "A", min: 82, max: 100, color: "bg-green-500" },
        { grade: "AB", min: 72, max: 81, color: "bg-green-400" },
        { grade: "BC", min: 62, max: 71, color: "bg-yellow-400" },
        { grade: "C", min: 50, max: 61, color: "bg-yellow-500" },
        { grade: "CD", min: 40, max: 49, color: "bg-orange-400" },
        { grade: "D", min: 30, max: 39, color: "bg-orange-600" },
        { grade: "F", min: 0, max: 29, color: "bg-red-500" },
    ],
    ADC: [
        { grade: "A", min: 90, max: 100, color: "bg-green-500" },
        { grade: "AB", min: 80, max: 89, color: "bg-green-400" },
        { grade: "BC", min: 70, max: 79, color: "bg-yellow-400" },
        { grade: "C", min: 58, max: 69, color: "bg-yellow-500" },
        { grade: "CD", min: 47, max: 57, color: "bg-orange-400" },
        { grade: "D", min: 35, max: 46, color: "bg-orange-600" },
        { grade: "F", min: 0, max: 34, color: "bg-red-500" },
    ],
    CCN: [
        { grade: "A", min: 85, max: 100, color: "bg-green-500" },
        { grade: "AB", min: 74, max: 84, color: "bg-green-400" },
        { grade: "BC", min: 63, max: 73, color: "bg-yellow-400" },
        { grade: "C", min: 52, max: 62, color: "bg-yellow-500" },
        { grade: "CD", min: 42, max: 51, color: "bg-orange-400" },
        { grade: "D", min: 31, max: 41, color: "bg-orange-600" },
        { grade: "F", min: 0, max: 30, color: "bg-red-500" },
    ],
};

function SubjectPanel({ subject}) {
    const ranges = subjects[subject];
    

    return (
        <div className="my-4 flex items-center justify-center">
            <div className="border-2 border-black bg-white rounded-2xl shadow-xl p-6 overflow-x-auto">
                
                <div className="flex gap-2">
                    {ranges.map((g) => (
                        <div
                            key={g.grade}
                            className={`flex gap-4 items-center justify-between px-4 py-3 rounded-lg ${g.color} text-white`}
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



function Predict() {
    const [selectedSubject, setSelectedSubject] = useState(null);
    const [expectedMarks, setExpectedMarks] = useState({});
    return (
        <div>
            <h1 className="text-2xl font-bold text-blue-600">Predict</h1>
            <div className="flex gap-4 mt-4">
                <button className="bg-green-900 text-white px-4 py-2 rounded-lg hover:bg-green-800 cursor-pointer">
                    View Current Marks Till Now
                </button>
                <button className="bg-green-900 text-white px-4 py-2 rounded-lg hover:bg-green-800 cursor-pointer">
                    Update Marks
                </button>
            </div>
            <div>
                <h2 className="text-xl text-orange-600 font-bold mt-6">Current Predictions</h2>
                <p className="my-1">Select a subject to view predicted grades.</p>
            
                <div className="flex gap-4 overflow-x-auto my-2">
                    {Object.keys(subjects).map((subject) => (
                        <button
                            key={subject}
                            onClick={()=>setSelectedSubject(
                                selectedSubject === subject ? null : subject
                            )}
                            className={`font-bold px-6 py-2 border-2 rounded-xl text-lg transition-all duration-200 shadow-sm 
                                ${
                                    selectedSubject === subject ?
                                    "bg-blue-600 text-white shadow-md"
                                    :"bg-white border-blue-200 hover:border-blue-500 hover:bg-blue-50 text-blue-700 hover:shadow-md"
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
                <h2 className="text-xl text-orange-600 font-bold mt-6">Enter expected marks</h2>
                <div className="flex flex-col gap-4 mt-4">
                    {Object.keys(subjects).map((subject) => (
                        <div class="grid grid-cols-3 gap-4 items-center">
                            <label class="text-lg font-medium text-gray-700">{subject}</label>
                            <input
                                type="number"
                                min="0"
                                max="100"
                                class="border rounded-lg p-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                placeholder={`Enter expected marks for ${subject}`}
                                onChange={(event) => {
                                    setExpectedMarks({
                                        ...expectedMarks,
                                        [subject]: event.target.value
                                    });
                                }}
                            />
                            <p class="flex bg-orange-100 rounded-lg justify-center text-lg font-medium text-gray-700">{
                                subjects[subject].find((g) => {
                                    return g.min <= parseInt(expectedMarks[subject]) && g.max >= parseInt(expectedMarks[subject]);
                                })?.grade
                            }</p>
                        </div>
                    ))}
                </div>
            </div>
            <div className="bg-green-100 p-4 mt-6 flex-1 overflow-x-auto rounded-lg">
                 <h2 className="text-xl text-green-600 font-bold">Improvements</h2>
                 <p className="text-gray-500 my-4">No suggestions available.</p>
            </div>
        </div>
    )
}

export default Predict;