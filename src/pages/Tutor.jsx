function Tutor(){
    return(
        <div>
            <h1 className="text-2xl font-bold text-[rgb(32,41,64)]">Tutor</h1>
            <div className="my-4 rounded-lg p-4 bg-[rgb(202,170,152,0.2)] max-h-72 overflow-y-auto">

                    <div className="py-2 flex gap-3 items-center justify-between">
                        <h2 className="text-xl text-[rgb(75,64,56)] font-bold">Documents Uploaded</h2>
                        <button
                            //onClick={}
                            className="min-w-0 bg-[rgb(75,86,148)] text-white font-bold px-4 py-2 rounded-lg hover:bg-[rgb(32,41,64)]"
                        >
                            Add
                        </button>
                    </div>
                    <div className="p-4 text-md flex flex-col items-start gap-3">
                        <p className="text-gray-500">No documents uploaded</p>
                    </div>
            </div>

            <div>
                <h2 className="text-xl text-[rgb(75,64,56)] font-bold mt-6">Choose a Subject</h2>
                <div className="flex gap-4 mt-4">
                    <button className="bg-[rgb(75,86,148)] text-white px-4 py-2 rounded-lg hover:bg-[rgb(32,41,64)] cursor-pointer">
                        Data Structures
                    </button>
                    <button className="bg-[rgb(75,86,148)] text-white px-4 py-2 rounded-lg hover:bg-[rgb(32,41,64)] cursor-pointer">
                        Algorithms
                    </button>
                    <button className="bg-[rgb(75,86,148)] text-white px-4 py-2 rounded-lg hover:bg-[rgb(32,41,64)] cursor-pointer">
                        Machine Learning
                    </button>
                </div>

            </div>
            <div>
                <h2 className="text-xl text-[rgb(75,64,56)] font-bold mt-6">Need help with study planning?</h2>
                <button className="mt-4 bg-[rgb(75,86,148)] text-white px-4 py-2 rounded-lg hover:bg-[rgb(32,41,64)] cursor-pointer">
                        Let's Chat!
                </button>
            </div>

        </div>
    )
}

export default Tutor;