import { useState, useRef, useEffect } from "react";
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

function ChatModal({ mode, subject, semester, userId, onClose }) {
    const [messages, setMessages] = useState(() => {
        // Seed with an intro message immediately, no API call
        if (mode === "subject_tutor") {
            return [
                {
                    role: "assistant",
                    content: `Hi! I'd love to help you study ${subject.name}! 📚\n\nYou can ask me doubts about specific topics, or just say "teach me [topic]" and I'll walk you through it in detail using your uploaded notes.`,
                },
            ];
        }
        return [
            {
                role: "assistant",
                content: `Hi! I'm here to help you plan your studies. Tell me what you're working with — upcoming exams, subjects to cover, how much time you have — and I'll help you build a plan.`,
            },
        ];
    });
    const [input, setInput] = useState("");
    const [sending, setSending] = useState(false);
    const scrollRef = useRef(null);
    //console.log(subject);
    useEffect(() => {
        scrollRef.current?.scrollTo(0, scrollRef.current.scrollHeight);
    }, [messages]);

    const sendMessage = async () => {
        if (!input.trim() || sending) return;

        const userMsg = { role: "user", content: input };
        const newMessages = [...messages, userMsg];
        setMessages(newMessages);
        setInput("");
        setSending(true);

        const endpoint =
            mode === "subject_tutor" ? "/api/tutor-chat" : "/api/study-plan-chat";

        try {
            console.log(userId, subject.course_code, semester, newMessages);
            const res = await fetch(`${BACKEND_URL}${endpoint}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    message: userMsg.content,
                    subjectCode: subject.course_code,
                    subjectName: subject.name,
                    semester,
                    userId,
                    history: messages,
                }),
            });

            const data = await res.json();
            setMessages((prev) => [
                ...prev,
                { role: "assistant", content: data.reply || "Sorry, something went wrong." },
            ]);
        } catch (err) {
            console.error("Chat request failed:", err);
            setMessages((prev) => [
                ...prev,
                { role: "assistant", content: "Failed to get a response. Please try again." },
            ]);
        } finally {
            setSending(false);
        }
    };
    const handleKeyDown = (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };

    return (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg w-full max-w-lg h-[32rem] flex flex-col p-4">
                <div className="flex justify-between items-center mb-3">
                    <h3 className="text-lg font-bold text-[rgb(32,41,64)]">
                        {mode === "subject_tutor" ? `Tutor — ${subject.name}` : "Study Planner"}
                    </h3>
                    <button
                        onClick={onClose}
                        className="text-gray-500 hover:text-gray-800 text-xl leading-none"
                    >
                        ×
                    </button>
                </div>

                <div
                    ref={scrollRef}
                    className="flex-1 overflow-y-auto flex flex-col gap-2 mb-3 px-1"
                >
                    {messages.length === 0 && (
                        <p className="text-gray-400 text-sm">
                            {mode === "subject_tutor"
                                ? `Ask anything about ${subject.name} — I'll reference your uploaded notes.`
                                : "Ask me to help plan your study schedule."}
                        </p>
                    )}
                    {messages.map((m, i) => (
                        <div
                            key={i}
                            className={`max-w-[80%] px-3 py-2 rounded-lg text-sm ${m.role === "user"
                                    ? "self-end bg-[rgb(75,86,148)] text-white"
                                    : "self-start bg-[rgb(202,170,152,0.25)] text-[rgb(75,64,56)]"
                                }`}
                        >
                            {m.content}
                        </div>
                    ))}
                    {sending && (
                        <div className="self-start text-sm text-gray-400 px-3 py-2">
                            Thinking...
                        </div>
                    )}
                </div>

                <div className="flex gap-2">
                    <textarea
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        rows={1}
                        placeholder="Type your question..."
                        className="flex-1 border rounded-lg px-3 py-2 text-sm resize-none"
                    />
                    <button
                        onClick={sendMessage}
                        disabled={sending}
                        className="bg-[rgb(75,86,148)] text-white px-4 py-2 rounded-lg hover:bg-[rgb(32,41,64)] disabled:opacity-50"
                    >
                        Send
                    </button>
                </div>
            </div>
        </div>
    );
}

export default ChatModal;