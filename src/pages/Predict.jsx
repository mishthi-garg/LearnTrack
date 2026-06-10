import { useState } from "react";

const subjects = {
    OS: [
        { grade: "A", min: 88, max: 100},
        { grade: "AB", min: 78, max: 87},
        { grade: "BC", min: 68, max: 77},
        { grade: "C", min: 55, max: 67},
        { grade: "CD", min: 45, max: 54},
        { grade: "D", min: 33, max: 44},
        { grade: "F", min: 0, max: 32},
    ],
    ESIOT: [
        { grade: "A", min: 82, max: 100},
        { grade: "AB", min: 72, max: 81},
        { grade: "BC", min: 62, max: 71},
        { grade: "C", min: 50, max: 61},
        { grade: "CD", min: 40, max: 49},
        { grade: "D", min: 30, max: 39},
        { grade: "F", min: 0, max: 29},
    ],
    ADC: [
        { grade: "A", min: 90, max: 100},
        { grade: "AB", min: 80, max: 89},
        { grade: "BC", min: 70, max: 79},
        { grade: "C", min: 58, max: 69},
        { grade: "CD", min: 47, max: 57},
        { grade: "D", min: 35, max: 46},
        { grade: "F", min: 0, max: 34},
    ],
    CCN: [
        { grade: "A", min: 85, max: 100},
        { grade: "AB", min: 74, max: 84},
        { grade: "BC", min: 63, max: 73},
        { grade: "C", min: 52, max: 62},
        { grade: "CD", min: 42, max: 51},
        { grade: "D", min: 31, max: 41},
        { grade: "F", min: 0, max: 30},
    ],
};

function SubjectPanel({ subject}) {
    const ranges = subjects[subject];
    

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



function Predict() {
    const [selectedSubject, setSelectedSubject] = useState(null);
    const [expectedMarks, setExpectedMarks] = useState({});
    return (
        <div>
            <h1 className="text-2xl font-bold text-[rgb(32,41,64)]">Predict</h1>
            <div className="flex gap-4 mt-4">
                <button className="bg-[rgb(75,86,148)] text-white px-4 py-2 rounded-lg hover:bg-[rgb(32,41,64)] cursor-pointer">
                    View Current Marks Till Now
                </button>
                <button className="bg-[rgb(75,86,148)] text-white px-4 py-2 rounded-lg hover:bg-[rgb(32,41,64)] cursor-pointer">
                    Update Marks
                </button>
            </div>
            <div>
                <h2 className="text-xl text-[rgb(75,64,56)] font-bold mt-6">Current Predictions</h2>
                <p className="text-[rgb(75,64,56)] my-1">Select a subject to view predicted grades.</p>
            
                <div className="flex gap-4 overflow-x-auto my-2">
                    {Object.keys(subjects).map((subject) => (
                        <button
                            key={subject}
                            onClick={()=>setSelectedSubject(
                                selectedSubject === subject ? null : subject
                            )}
                            className={`font-bold px-6 py-2 rounded-xl text-lg transition-all duration-100 shadow-sm 
                                ${
                                    selectedSubject === subject ?
                                    "bg-[rgb(75,64,56)] text-[rgb(238,238,238)] shadow-md"
                                    :"bg-[rgb(238,238,238)] border-2 border-[rgb(154,134,120)] hover:border-[rgb(75,64,56)] text-[rgb(75,64,56)] hover:bg-[rgb(75,64,56,0.2)] hover:shadow-md"
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
                    {Object.keys(subjects).map((subject) => (
                        <div class="grid grid-cols-3 gap-4 items-center">
                            <label class="text-lg font-medium text-[rgb(75,64,56)]">{subject}</label>
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
                            <p class="flex rounded-lg justify-center text-lg font-bold text-[rgb(75,64,56)]">{
                                subjects[subject].find((g) => {
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