import { ActivityCalendar } from "react-activity-calendar";
import { useState } from "react";

function Dashboard() {
    const activityData1 = {
        "2026-01-05": 3,
        "2026-02-10": 1,
        "2026-03-15": 4,
        "2026-04-20": 2,
        "2026-06-07": 1,
    };

    const [tasks, setTasks] = useState([]);
    const [taskInput, setTaskInput] = useState("");

    const [heatmapCounts, setHeatmapCounts] = useState(activityData1);

    const today = new Date().toISOString().split('T')[0];

    const addTask = () => {
        if (taskInput.trim() === "") return;

        const newTask = {
            id: Date.now(),
            text: taskInput,
            completed: false,
        };

        setTasks([...tasks, newTask]);
        setTaskInput("");
    };

    const toggleTask = (id) => {
        setTasks(
            tasks.map((task) => {
                if (task.id === id) {

                    const delta = task.completed ? -1 : 1;

                    setHeatmapCounts ((prev)=>{
                        return {
                            ...prev,
                            [today]: Math.max(0, (prev[today]+delta)),
                        }
                    })

                    return { ...task, completed: !task.completed };
                }
                return task;
            })
        );
        
    };

    const deleteTask = (id) => {
        setTasks(
            tasks.filter((task) => task.id !== id)
        );
    };

    const buildActivityData = () => {
        const base = { [today]: 0, ...heatmapCounts};
        return Object.entries(base)
            .map(([date,count])=>({date,count,level: Math.min(count,5)}))
            .sort((a,b)=> a.date.localeCompare(b.date));
    }


    return (
        <div className="flex flex-col gap-6">
            <h1 className="text-2xl font-bold text-blue-600">Dashboard</h1>
            <div className="flex gap-6">

                <div className="p-4 rounded-lg bg-orange-100 basis-1/3 max-h-64 overflow-y-auto">
                    <h2 className="text-xl text-orange-500 font-bold">To-Do List</h2>

                    <div className="py-2 flex gap-3">
                        <input
                            type="text"
                            value={taskInput}
                            onChange={(e) => setTaskInput(e.target.value)}
                            className="min-w-0 border rounded-lg bg-white p-2 flex-1"
                            placeholder="Add a new task"
                        />
                        <button
                            onClick={addTask}
                            className="min-w-0 bg-blue-600 text-white font-bold px-4 py-2 rounded-lg hover:bg-blue-700"
                        >
                            Add
                        </button>
                    </div>

                    <div className="p-4 text-md flex flex-col items-start gap-3">
                        {tasks.length === 0 ? (
                            <p className="text-gray-500">No pending tasks</p>
                        ) : (
                            tasks.map((task) => (
                                <div key={task.id} className="flex gap-6 items-center w-full">
                                    <input
                                        type="checkbox"
                                        checked={task.completed}
                                        onChange={() => toggleTask(task.id)}
                                    />

                                    <span className={task.completed ? "line-through text-gray-500 flex-1" : "flex-1"}>
                                        {task.text}
                                    </span>

                                    <button
                                        onClick={() => deleteTask(task.id)}
                                        className="min-w-0 text-red-500 hover:text-red-700"
                                    >
                                        Delete
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                </div>
                <div className="basis-2/3 bg-green-100 p-6 flex-1 overflow-x-auto rounded-lg">

                    <h2 className="text-xl text-green-500 font-bold">Activity</h2>
                    <ActivityCalendar
                        data={buildActivityData()}
                        hideMonthLabels={false}
                        hideTotalCount={true}
                        hideColorLegend={false}
                        fontSize={16}
                        className="py-2"
                    />
                </div>

            </div>
            <div className="rounded-lg bg-purple-100 p-6 text-purple-500">
                <h2 className="text-xl text-purple-500 font-bold">Events</h2>
                <p className="p-4 text-gray-500">No upcoming events</p>
            </div>

        </div>
    )
}

export default Dashboard;