import { ActivityCalendar } from "react-activity-calendar";
import { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";

function Dashboard({ user }) {

    const [tasks, setTasks] = useState([]);
    const [taskInput, setTaskInput] = useState("");

    const [heatmapCounts, setHeatmapCounts] = useState({});

    const today = new Date().toISOString().split('T')[0];


    useEffect(() => {
        if (!user) return;

        const fetchTasks = async () => {
            const { data, error } = await supabase
                .from("tasks")
                .select("*")
                .eq("user_id", user.id)
                .order("created_at", { ascending: true });

            if (error) console.error("Error fetching tasks:", error);
            else setTasks(data);
        };

        const fetchActivity = async () => {
            const { data, error } = await supabase
                .from("activity_log")
                .select("*")
                .eq("user_id", user.id);

            if(error) console.error("Error fetching activity:", error);
            else{
                const counts = {};
                data.forEach((row)=>{
                    counts[row.date] = row.count;
                });
                setHeatmapCounts(counts);
            }
        }

        fetchTasks();
        fetchActivity();
    }, [user]);

    const updateActivityLog = async (delta) => {
        const { data, error } = await supabase
            .from("activity_log")
            .select("*")
            .eq("user_id",user.id)
            .eq("date", today)
            .single();
        
            if (data){
                const newCount = Math.max(0, data.count + delta);
                await supabase
                    .from("activity_log")
                    .update({count: newCount})
                    .eq("id", data.id);
            }
            else{
                if(delta>0){
                    await supabase
                        .from("activity_log")
                        .insert({
                            user_id: user.id,
                            date: today,
                            count: 1
                        });
                }
            }
    }
    
    const addTask = async () => {
        if (taskInput.trim() === "") return;

        const newTask = {
            user_id: user.id,
            text: taskInput,
            is_done: false,
        };

        const { data, error } = await supabase
            .from("tasks")
            .insert(newTask)
            .select()
            .single();

        if (error) console.error("Error adding task:", error);
        else setTasks([...tasks, data]);

        setTaskInput("");
    };

    const toggleTask = async (id) => {
        const task = tasks.find((t) => t.id === id);
        const newDone = !task.is_done;

        const { error } = await supabase
            .from("tasks")
            .update({ is_done: newDone })
            .eq("id", id)

        if (error) { console.error("Error toggling task:", error); return; }

        const delta = newDone ? 1 : -1;
        await updateActivityLog(delta);

        setHeatmapCounts((prev) => {
            return {
                ...prev,
                [today]: Math.max(0, ((prev[today] || 0) + delta)),
            }
        });

        setTasks(tasks.map((t) => t.id === id ? { ...t, is_done: newDone } : t));
    };

    const deleteTask = async (id) => {
        const { error } = await supabase
            .from("tasks")
            .delete()
            .eq("id",id);

        if(error) console.error("Error deleting task:", error);
        else setTasks(
            tasks.filter((task) => task.id !== id)
        );
    };

    const buildActivityData = () => {
        const base = { [today]: 0, ...heatmapCounts };
        return Object.entries(base)
            .map(([date, count]) => ({ date, count, level: Math.min(count, 5) }))
            .sort((a, b) => a.date.localeCompare(b.date));
    }

    return (
        <div className="flex flex-col gap-6">
            <h1 className="text-2xl font-bold text-[rgb(32,41,64)]">Dashboard</h1>
            <div className="flex gap-6">

                <div className="p-4 rounded-lg bg-[rgb(202,170,152,0.2)] basis-1/3 max-h-64 overflow-y-auto">
                    <h2 className="text-xl text-[rgb(75,64,56)] font-bold">To-Do List</h2>

                    <div className="py-2 flex gap-3">
                        <input
                            type="text"
                            value={taskInput}
                            onKeyDown={e => e.key === 'Enter' && addTask()}
                            onChange={(e) => setTaskInput(e.target.value)}
                            className="min-w-0 border rounded-lg bg-white p-2 flex-1 focus:ring-2 focus:ring-[rgb(32,41,64)] focus:outline-none"
                            placeholder="Add a new task"
                        />
                        <button
                            onClick={addTask}
                            className="min-w-0 bg-[rgb(75,86,148)] text-white font-bold px-4 py-2 rounded-lg hover:bg-[rgb(32,41,64)]"
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
                                        checked={task.is_done}
                                        onChange={() => toggleTask(task.id)}
                                    />

                                    <span className={task.is_done ? "line-through text-gray-500 flex-1" : "flex-1"}>
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
                <div className="basis-2/3 bg-[rgb(202,170,152,0.2)] p-6 flex-1 overflow-x-auto rounded-lg">

                    <h2 className="text-xl text-[rgb(75,64,56)] font-bold">Activity</h2>
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
            <div className="rounded-lg bg-[rgba(202,170,152,0.2)] p-6 text-purple-500">
                <h2 className="text-xl text-[rgb(75,64,56)] font-bold">Events</h2>
                <p className="p-4 text-gray-500">No upcoming events</p>
            </div>

        </div>
    )
}

export default Dashboard;