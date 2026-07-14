import { useState, useMemo, useEffect } from "react";
import { supabase } from "../supabaseClient";
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;
const TABLE = "reminders";

const COLORS = {
    red: { swatch: "bg-red-300", dot: "bg-red-600", bg: "bg-red-100", border: "border-red-400", text: "text-red-700" },
    blue: { swatch: "bg-blue-300", dot: "bg-blue-600", bg: "bg-blue-100", border: "border-blue-400", text: "text-blue-700" },
    green: { swatch: "bg-green-300", dot: "bg-green-600", bg: "bg-green-100", border: "border-green-400", text: "text-green-700" },
    orange: { swatch: "bg-orange-300", dot: "bg-orange-600", bg: "bg-orange-100", border: "border-orange-400", text: "text-orange-700" },
    black: { swatch: "bg-black", dot: "bg-black", bg: "bg-gray-200", border: "border-gray-500", text: "text-gray-800" },
    zinc: { swatch: "bg-zinc-300", dot: "bg-zinc-500", bg: "bg-zinc-100", border: "border-zinc-400", text: "text-zinc-700" },
};
const COLOR_ORDER = ["red", "blue", "green", "orange", "black", "zinc"];


function formatKey(date) {
    // Local-date key, avoids UTC offset bugs from toISOString()
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
}

function getMonthGrid(year, month) {
    // month is 0-indexed. Returns array of Date objects (42 cells, 6 weeks)
    // including leading/trailing days from adjacent months for a full grid.
    const firstOfMonth = new Date(year, month, 1);
    const startDay = firstOfMonth.getDay(); // 0 = Sunday
    const gridStart = new Date(year, month, 1 - startDay);

    return Array.from({ length: 42 }, (_, i) => {
        const d = new Date(gridStart);
        d.setDate(gridStart.getDate() + i);
        return d;
    });
}

function Timetable({ user }) {
    const today = new Date();
    const [viewYear, setViewYear] = useState(today.getFullYear());
    const [viewMonth, setViewMonth] = useState(today.getMonth());
    const [selectedDate, setSelectedDate] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const [reminders, setReminders] = useState({});

    // Draft form state for the modal
    const [draftColor, setDraftColor] = useState("red");
    const [draftTitle, setDraftTitle] = useState("");
    const [draftTime, setDraftTime] = useState("");
    const [draftEndTime, setDraftEndTime] = useState("");
    const [draftNotes, setDraftNotes] = useState("");

    const monthGrid = useMemo(() => getMonthGrid(viewYear, viewMonth), [viewYear, viewMonth]);
    const monthLabel = new Date(viewYear, viewMonth).toLocaleString("default", { month: "long", year: "numeric" });

    useEffect(() => {
        let cancelled = false;

        async function loadReminders() {
            setLoading(true);
            const { data, error } = await supabase
                .from(TABLE)
                .select("*")
                .eq("user_id", user.id)
                .order("date", { ascending: true })
                .order("time", { ascending: true });

            if (cancelled) return;

            if (error) {
                setError(error.message);
            } else {
                const grouped = {};
                for (const row of data) {
                    (grouped[row.date] ||= []).push(row);
                }
                setReminders(grouped);
            }
            setLoading(false);
        }

        loadReminders();
        return () => { cancelled = true; };
    }, [user]);


    function goPrevMonth() {
        if (viewMonth === 0) { setViewMonth(11); setViewYear(viewYear - 1); }
        else setViewMonth(viewMonth - 1);
    }

    function goNextMonth() {
        if (viewMonth === 11) { setViewMonth(0); setViewYear(viewYear + 1); }
        else setViewMonth(viewMonth + 1);
    }

    function openDay(date) {
        setSelectedDate(date);
        setDraftColor("red");
        setDraftTitle("");
        setDraftTime("");
        setDraftEndTime("");
        setDraftNotes("");
        setShowModal(true);
    }

    const handleConnect = () => {
        window.location.href = `${BACKEND_URL}/auth/google?user_id=${user.id}`;
    };

    async function saveReminder() {
        if (!draftTitle.trim()) return; // basic guard — don't save empty entries

        const key = formatKey(selectedDate);
        const isAllDay = !draftTime;
        const newEntry = {
            date: key,
            color: draftColor,
            title: draftTitle.trim(),
            time: draftTime || null,
            end_time: draftEndTime || null,
            all_day: isAllDay,
            source: "learntrack",
            notes: draftNotes.trim() || null,
            user_id: user.id,
        };

        const { data, error } = await supabase
            .from(TABLE)
            .insert(newEntry)
            .select()
            .single();

        if (error) {
            setError(error.message);
            return;
        }


        setReminders((prev) => ({
            ...prev,
            [key]: [...(prev[key] || []), data],
        }));

        setShowModal(false);

        try {
            const { data: { session } } = await supabase.auth.getSession();
            await fetch(`${BACKEND_URL}/reminders/${data.id}/sync-google`, {
                method: "POST",
                headers: { Authorization: `Bearer ${session.access_token}` },
            });
        } catch (err) {
            console.error("Google sync failed:", err);
        }
    }

    async function deleteReminder(dateKey, id) {
        const reminder = reminders[dateKey]?.find((r) => r.id === id);
        const { error } = await supabase.from(TABLE).delete().eq("id", id);
        if (error) {
            setError(error.message);
            return;
        }
        setReminders((prev) => ({
            ...prev,
            [dateKey]: prev[dateKey].filter((r) => r.id !== id),
        }));
        if (reminder?.google_event_id) {
            try {
                const { data: { session } } = await supabase.auth.getSession();
                await fetch(`${BACKEND_URL}/reminders/${id}/sync-google`, {
                    method: "DELETE",
                    headers: {
                        Authorization: `Bearer ${session.access_token}`,
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({ googleEventId: reminder.google_event_id }),
                });
            } catch (err) {
                console.error("Google delete failed:", err);
            }
        }
    }


    const selectedKey = selectedDate ? formatKey(selectedDate) : null;
    const selectedReminders = selectedKey ? reminders[selectedKey] || [] : [];

    // Upcoming reminders (today or later), flattened and sorted, for the side list.
    const upcoming = useMemo(() => {
        const todayKey = formatKey(today);
        return Object.entries(reminders)
            .filter(([date]) => date >= todayKey)
            .flatMap(([date, items]) => items.map((r) => ({ ...r, date })))
            .sort((a, b) => (a.date + (a.time || "")).localeCompare(b.date + (b.time || "")))
            .slice(0, 8);
    }, [reminders]);


    return (
        <div className="flex flex-col gap-6">
            <div className="flex justify-between flex-col md:flex-row gap-2">
                <h1 className="cause text-3xl font-bold text-[rgb(32,41,64)]">Timetable</h1>
                <button onClick={handleConnect}
                    className="cursor-pointer min-w-0 bg-[rgb(75,86,148)] text-white font-bold sniglet-regular px-4 py-2 rounded-lg hover:bg-[rgb(32,41,64)]"
                >
                    Connect Google Calendar
                </button>
            </div>

            {error && (
                <p className="text-sm text-red-600 mt-2">Error: {error}</p>
            )}

            {/* Header / month nav */}
            <div className="flex flex-col items-center md:flex-row justify-between gap-8 w-full">
                <div className="flex-1 p-6 rounded-lg w-full bg-[rgba(202,170,152,0.2)]">
                    {/* list */}
                    <h2 className="text-xl text-[rgb(75,64,56)] space-mono-bold">Upcoming Events</h2>

                    <div className="px-4 w-full h-138 overflow-y-auto rounded-xl py-6 flex flex-col gap-4">
                        {loading && <p className="text-sm text-gray-400">Loading…</p>}
                        {!loading && upcoming.length === 0 && (
                            <p className="text-sm text-gray-400">No upcoming reminders. Tap a day to add one.</p>
                        )}

                        {!loading && upcoming.map((r, i) => (
                            <div key={r.id} className={i > 0 ? "pt-4" : ""}>
                                <div className="flex items-center gap-2">
                                    <span className={`w-2 h-2 rounded-full ${COLORS[r.color]?.dot || "bg-gray-400"}`}></span>
                                    <p className="text-sm text-gray-500">
                                        {new Date(r.date + "T00:00:00").toLocaleDateString("default", { weekday: "short", month: "short", day: "numeric" })}
                                    </p>
                                    {r.time && <div className={`${COLORS[r.color]?.bg} w-fit px-2 py-0.5 rounded-full text-xs ml-2`}>{r.time}</div>}
                                </div>
                                <p className="mt-2 text-[rgb(40,20,9)]">{r.title}</p>

                            </div>
                        ))}
                    </div>
                </div>
                <div className="flex-1 min-w-0">
                    {/* Calendar grid */}
                    <div className="flex flex-col justify-center max-w-full min-w-0">
                        <div className="flex items-center justify-center mb-4">

                            <div className="flex items-center gap-3">
                                <button
                                    onClick={goPrevMonth}
                                    className="cursor-pointer w-6 h-6 rounded-full border border-yellow-700 text-[rgb(40,20,9)] hover:bg-yellow-50 flex items-center justify-center"
                                >
                                    ‹
                                </button>
                                <p className="space-mono-bold text-[rgb(40,20,9)] w-36 text-center">{monthLabel}</p>
                                <button
                                    onClick={goNextMonth}
                                    className="cursor-pointer w-6 h-6 rounded-full border border-yellow-700 text-[rgb(40,20,9)] hover:bg-yellow-50 flex items-center justify-center"
                                >
                                    ›
                                </button>
                            </div>
                        </div>
                        <div className="w-full max-w-2xl grid grid-cols-7 gap-2">
                            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
                                <div key={d} className="text-center text-xs text-[rgb(75,64,56)]">{d}</div>
                            ))}
                            {monthGrid.map((date, i) => {
                                const key = formatKey(date);
                                const dayReminders = reminders[key] || [];
                                const isCurrentMonth = date.getMonth() === viewMonth;
                                const isToday = formatKey(date) === formatKey(today);

                                // Dominant tint = first reminder's color for that day (if any)
                                const dominant = dayReminders[0] ? COLORS[dayReminders[0].color] : null;
                                const cellBg = dominant ? dominant.bg : "bg-yellow-50";
                                const cellBorder = dominant ? dominant.border : "border-transparent";


                                return (
                                    <button
                                        key={i}
                                        onClick={() => openDay(date)}
                                        className={`
                relative aspect-square
                rounded-lg sm:rounded-xl
                border text-center p-1.5 sm:p-2
                cursor-pointer transition

                ${isCurrentMonth ? cellBg : "bg-[rgb(238,238,238)]"}
                ${isToday ? "border-yellow-700 border-2" : cellBorder}

                hover:border-[rgb(32,41,64)]
              `}
                                    >
                                        <span className={`text-sm sm:text-md ${isCurrentMonth ? "text-[rgb(40,20,9)]" : "text-gray-400"}`}>
                                            {date.getDate()}
                                        </span>

                                        {/* Dots for each reminder type present that day */}
                                        <div className="absolute bottom-1 left-1.5 sm:bottom-1.5 sm:left-2 flex gap-1">
                                            {dayReminders.slice(0, 3).map((r) => (
                                                <span key={r.id} className={`w-1.5 h-1.5 rounded-full ${COLORS[r.color]?.dot || "bg-gray-400"}`}></span>
                                            ))}
                                        </div>
                                    </button>
                                );
                            })}
                        </div>

                    </div>
                </div>
            </div>
            {/* Day detail / add modal */}
            {showModal && selectedDate && (
                <div className="fixed inset-0 bg-black/30 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-2xl w-full max-w-md p-5 sm:p-6 shadow-xl">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg space-mono-bold text-[rgb(40,20,9)]">
                                {selectedDate.toLocaleDateString("default", { weekday: "long", month: "long", day: "numeric" })}
                            </h3>
                            <button onClick={() => setShowModal(false)} className="cursor-pointer text-gray-400 hover:text-gray-600 text-xl">
                                ×
                            </button>
                        </div>

                        {/* Existing reminders for this day */}
                        {selectedReminders.length > 0 && (
                            <div className="flex flex-col gap-2 mb-4 max-h-40 overflow-y-auto">
                                {selectedReminders.map((r) => (
                                    <div key={r.id} className={`flex items-center justify-between rounded-lg border px-3 py-2 ${COLORS[r.color]?.bg} ${COLORS[r.color]?.border}`}>
                                        <div>
                                            <p className={`text-sm font-medium ${COLORS[r.color]?.text}`}>{r.title}</p>
                                            {r.time && <p className="text-xs text-gray-500">{r.time}</p>}
                                        </div>
                                        <button
                                            onClick={() => deleteReminder(selectedKey, r.id)}
                                            className="exo cursor-pointer text-gray-400 hover:text-[rgb(193,102,107)] text-sm"
                                        >
                                            Remove
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}


                        {/* Add new reminder form */}
                        <div className="flex flex-col gap-3">

                            <div className="flex w-full gap-4 items-center">
                                {COLOR_ORDER.map((color) => (
                                    <button
                                        key={color}
                                        type="button"
                                        onClick={() => setDraftColor(color)}
                                        title={color}
                                        className={`cursor-pointer w-8 h-8 rounded-full ${COLORS[color].swatch} transition ring-offset-2 ${draftColor === color ? "ring-2 ring-[rgb(40,20,9)]" : ""
                                            }`}
                                    ></button>
                                ))}
                            </div>
                            <input
                                type="text"
                                placeholder="Title*"
                                value={draftTitle}
                                onChange={(e) => setDraftTitle(e.target.value)}
                                className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-yellow-700"
                            />
                            <div className="flex flex-col md:flex-row justify-between">
                                <div className="flex gap-3 items-center">
                                    <p className="text-sm">Start Time:</p>
                                    <input
                                        type="time"
                                        value={draftTime}
                                        onChange={(e) => setDraftTime(e.target.value)}
                                        className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-yellow-700"
                                    />
                                </div>
                                <div className="flex gap-3 items-center">
                                    <p className="text-sm">End Time:</p>
                                    <input
                                        type="time"
                                        value={draftEndTime}
                                        onChange={(e) => setDraftEndTime(e.target.value)}
                                        className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-yellow-700"
                                    />
                                </div>
                            </div>

                            <textarea
                                placeholder="Notes (optional)"
                                value={draftNotes}
                                onChange={(e) => setDraftNotes(e.target.value)}
                                rows={2}
                                className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-yellow-700 resize-none"
                            />

                            <button
                                onClick={saveReminder}
                                className="cursor-pointer min-w-0 bg-[rgb(75,86,148)] text-white font-bold sniglet-regular px-4 py-2 rounded-lg hover:bg-[rgb(32,41,64)]"
                            >
                                Save reminder
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
}

export default Timetable;