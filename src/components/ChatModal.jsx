import { useState, useRef, useEffect } from "react";
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;
import { supabase } from "../supabaseClient";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useParams, useLocation, useNavigate } from "react-router-dom";

function ChatModal() {
    const { mode } = useParams(); // "subject_tutor" | "study_plan"
  const location = useLocation();
  const navigate = useNavigate();

  const { subject, semester } = location.state || {};
  console.log(subject, semester, mode);
    const [messages, setMessages] = useState(() => {
        // Seed with an intro message immediately, no API call
        if (mode === "subject_tutor") {
            return [
                {
                    role: "assistant",
                    content: `Hi! I'd love to help you study ${subject?.name}! 📚\n\nYou can ask me doubts about specific topics, or just say "teach me [topic]" and I'll walk you through it in detail using your uploaded notes.`,
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
        const body =
            mode === "subject_tutor"
                ? {
                    message: userMsg.content,
                    subjectCode: subject?.course_code,
                    subjectName: subject?.name,
                    semester,
                    history: messages,
                } : {
                    message: userMsg.content,
                    history: messages,
                };
        try {
            const { data: { session } } = await supabase.auth.getSession();
            //console.log(userId, subject.course_code, semester, newMessages);
            const res = await fetch(`${BACKEND_URL}${endpoint}`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${session?.access_token}`
                },
                body: JSON.stringify(body),
            });


            const data = await res.json();
            console.log("Received response:", data);
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
    
const onClose = () => {
       
            navigate(-1);
        
    };
    return (
        // <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
             <div className="bg-white rounded-lg w-full h-[calc(100vh-112px)] flex flex-col p-4">
                <div className="flex justify-between items-center mb-3">
                    <h3 className="text-lg font-bold text-[rgb(32,41,64)]">
                        {mode === "subject_tutor" ? `Tutor — ${subject?.name}` : "Study Planner"}
                    </h3>
                    <button
                        onClick={onClose}
                        className="cursor-pointer text-gray-500 hover:text-gray-800 text-xl leading-none"
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
                            className={`max-w-[80%] min-w-0 px-3 py-2 rounded-lg text-sm 
                                [&_p]:mb-4
                                [&_ul]:my-4
                                [&_ol]:my-4
                                [&_li]:mb-2
                                [&_h1]:mb-4 [&_h1]:mt-6
                                [&_h2]:mb-3 [&_h2]:mt-5
                                [&_h3]:mb-2 [&_h3]:mt-4
                                [&_pre]:my-4 
                                [&_code]:rounded [&_code]:px-2 [&_code]:bg-gray-100
                                ${m.role === "user"
                                    ? "self-end bg-[rgb(75,86,148)] text-white"
                                    : "self-start bg-[rgb(202,170,152,0.25)] text-[rgb(75,64,56)]"
                                }`}
                        >
                            <div className="overflow-x-auto"> 
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                {m.content}
                            </ReactMarkdown>
                            </div>
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
                        className="cursor-pointer bg-[rgb(75,86,148)] text-white px-4 py-2 rounded-lg hover:bg-[rgb(32,41,64)] disabled:opacity-50"
                    >
                        Send
                    </button>
                </div>
            </div>
        /* </div> */
    );
}

export default ChatModal;