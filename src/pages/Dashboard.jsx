import { ActivityCalendar } from "react-activity-calendar";
import { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import { NavLink } from "react-router-dom";
const TABLE = "reminders";

const COLORS = {
    red: { swatch: "bg-red-300", dot: "bg-red-600", bg: "bg-red-100", border: "border-red-400", text: "text-red-700" },
    blue: { swatch: "bg-blue-300", dot: "bg-blue-600", bg: "bg-blue-100", border: "border-blue-400", text: "text-blue-700" },
    green: { swatch: "bg-green-300", dot: "bg-green-600", bg: "bg-green-100", border: "border-green-400", text: "text-green-700" },
    orange: { swatch: "bg-orange-300", dot: "bg-orange-600", bg: "bg-orange-100", border: "border-orange-400", text: "text-orange-700" },
    black: { swatch: "bg-black", dot: "bg-black", bg: "bg-gray-200", border: "border-gray-500", text: "text-gray-800" },
    zinc: { swatch: "bg-zinc-300", dot: "bg-zinc-500", bg: "bg-zinc-100", border: "border-zinc-400", text: "text-zinc-700" },
};

function Dashboard({ user }) {
    const [reminders, setReminders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [tasks, setTasks] = useState([]);
    const [taskInput, setTaskInput] = useState("");

    const [heatmapCounts, setHeatmapCounts] = useState({});

    const today = new Date().toISOString().split('T')[0];



    const [profileComplete, setProfileComplete] = useState(true);
        useEffect(() => {
            let cancelled = false;
    
            async function loadReminders() {
                setLoading(true);
                const { data, error } = await supabase
                    .from(TABLE)
                    .select("*")
                    .eq("user_id", user.id)
                    .eq("date", today)
                    .order("date", { ascending: true })
                    .order("time", { ascending: true });
    
                if (cancelled) return;
    
                if (error) {
                    setError(error.message);
                } else {
                    setReminders(data);
                }
                setLoading(false);
            }
    
            loadReminders();
            return () => { cancelled = true; };
        }, [user]);


    useEffect(() => {
        const checkProfile = async () => {
            const { data } = await supabase
                .from("profiles")
                .select("name, roll_no, branch, batch, college")
                .eq("id", user.id)
                .single();

            if (!data || !data.name || !data.roll_no || !data.branch || !data.batch || !data.college) setProfileComplete(false);
        };
        checkProfile();
    }, [user]);

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

            if (error) console.error("Error fetching activity:", error);
            else {
                const counts = {};
                data.forEach((row) => {
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
            .eq("user_id", user.id)
            .eq("date", today)
            .single();

        if (data) {
            const newCount = Math.max(0, data.count + delta);
            await supabase
                .from("activity_log")
                .update({ count: newCount })
                .eq("id", data.id);
        }
        else {
            if (delta > 0) {
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
        const completedAt = newDone ? today : null;
        //checking any task-> +1, unchecking todays completed -> -1, unchecking older completed -> 0
        const { error } = await supabase
            .from("tasks")
            .update({ is_done: newDone, completed_at: completedAt })
            .eq("id", id)

        if (error) { console.error("Error toggling task:", error); return; }
        const wasCompletedToday = task.completed_at === today;
        if (newDone || wasCompletedToday) {
            const delta = newDone ? 1 : -1;
            await updateActivityLog(delta);

            setHeatmapCounts((prev) => {
                return {
                    ...prev,
                    [today]: Math.max(0, ((prev[today] || 0) + delta)),
                }
            });
        }

        setTasks(tasks.map((t) => t.id === id ? { ...t, is_done: newDone, completed_at: completedAt } : t));
    };

    const deleteTask = async (id) => {
        const { error } = await supabase
            .from("tasks")
            .delete()
            .eq("id", id);

        if (error) console.error("Error deleting task:", error);
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
    console.log(buildActivityData());
    return (
        <div className="flex flex-col gap-6">
            <h1 className="cause text-3xl font-bold text-[rgb(32,41,64)]">Dashboard</h1>

            {
                !profileComplete && (
                    <div className="bg-yellow-50 border border-yellow-300 rounded-lg px-4 py-3 flex gap-3 items-center justify-between">
                        <p className="text-yellow-800 text-md">Seems like your profile is incomplete! Please complete your profile to get the most out of LearnTrack.</p>
                        <NavLink to="/profile" className="exo text-sm font-bold text-[rgb(75,86,148)] hover:underline">
                            Click to Complete Profile
                        </NavLink>
                    </div>

                )
            }

            <div className="flex gap-6 flex-col md:flex-row">

                <div className="p-4 rounded-lg bg-[rgb(202,170,152,0.2)] basis-1/3 max-h-full overflow-y-auto">
                    <h2 className="text-xl text-[rgb(75,64,56)] space-mono-bold">To-Do List</h2>

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
                            className="cursor-pointer min-w-0 bg-[rgb(75,86,148)] text-white font-bold sniglet-regular px-4 py-2 rounded-lg hover:bg-[rgb(32,41,64)]"
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
                                        className="exo cursor-pointer min-w-0 text-red-500 hover:text-red-700"
                                    >
                                        Delete
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                </div>
                <div className="basis-2/3 bg-[rgb(202,170,152,0.2)] p-6 flex-1 overflow-x-auto rounded-lg">

                    <h2 className="text-xl text-[rgb(75,64,56)] space-mono-bold">Activity</h2>
                    <ActivityCalendar
                        data={buildActivityData()}
                        colorScheme="light"
                        theme={{
                            light: [
                                "#F8F3EA", // 0 activity
                                "#c3b6a1", // low
                                "#948470", // medium
                                "#725e4b", // high
                                "#513f2e", // very high
                            ],
                            dark: [
                                "#513f2e",
                                "#725e4b",
                                "#948470",
                                "#c3b6a1",
                                "#F8F3EA",
                            ],
                        }}
                        hideMonthLabels={false}
                        hideTotalCount={true}
                        hideColorLegend={false}
                        fontSize={16}
                        className="py-2"
                    />
                </div>

            </div>
            <div className="rounded-lg bg-[rgba(202,170,152,0.2)] p-6">
                <h2 className="text-xl text-[rgb(75,64,56)] space-mono-bold">Today's Events</h2>
                {/* <p className="p-4 text-gray-500">No upcoming events</p> */}
                <div className="px-4 w-full overflow-y-auto rounded-xl mt-6 py-6 flex flex-col gap-4">
                        {loading && <p className="text-sm text-gray-400">Loading…</p>}
                        {!loading && reminders.length === 0 && (
                            <p className="text-gray-500">No events today!</p>
                        )}

                        {!loading && reminders.map((r, i) => (
                            <div key={r.id} className={i > 0 ? "pt-4" : ""}>
                                <div className="flex items-center gap-2">
                                    <span className={`w-2 h-2 rounded-full ${COLORS[r.color]?.dot || "bg-gray-400"}`}></span>
                                    <p className="text-sm text-gray-500">
                                        {new Date(r.date + "T00:00:00").toLocaleDateString("default", { weekday: "short", month: "short", day: "numeric" })}
                                    </p>
                                    {r.time && <div className={`${COLORS[r.color]?.bg} w-fit px-2 py-0.5 rounded-full text-xs ml-2`}>{r.time.slice(0, 5)}</div>}
                                </div>
                                <p className="mt-2 text-[rgb(40,20,9)]">{r.title}</p>
                                
                            </div>
                        ))}
                    </div>
            </div>

        </div>
    )
}

export default Dashboard;