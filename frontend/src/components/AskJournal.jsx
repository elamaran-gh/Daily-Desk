import { useState } from "react";
import { useAskJournalMutation } from "../redux/api/ragApiSlice";

const AskJournal = () => {
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState([]);
  const [askJournal, { isLoading }] = useAskJournalMutation();

  const handleAsk = async () => {
    if (!question.trim()) return;
    const userMessage = question;
    setMessages((prev) => [...prev, { role: "user", text: userMessage }]);
    setQuestion("");
    try {
      const res = await askJournal({ question: userMessage }).unwrap();
      setMessages((prev) => [...prev, { role: "ai", text: res.answer }]);
    } catch {
      setMessages((prev) => [...prev, { role: "ai", text: "Something went wrong. Please try again." }]);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleAsk();
    }
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-20 z-10 left-[calc(100vw-12rem)] btn btn-primary btn-sm gap-2"
      >
        Ask Journal
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-base-100 rounded-2xl shadow-xl w-full max-w-lg mx-4 flex flex-col" style={{ height: "520px" }}>
            
            <div className="flex items-center justify-between px-5 py-4 border-b border-base-300">
              <h2 className="font-semibold text-lg">Ask Your Journal</h2>
              <button onClick={() => setOpen(false)} className="btn btn-ghost btn-sm btn-circle">✕</button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-3">
              {messages.length === 0 && (
                <div className="text-center text-base-content/50 mt-10">
                  <p className="text-3xl mb-2">📔</p>
                  <p className="text-sm">Ask anything about your journal entries!</p>
                  <p className="text-xs mt-1">e.g. "How was my mood last week?" or "What did I write about work?"</p>
                </div>
              )}
              {messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`px-4 py-2 rounded-2xl max-w-[80%] text-sm ${msg.role === "user" ? "bg-primary text-primary-content" : "bg-base-200"}`}>
                    {msg.text}
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="px-4 py-2 rounded-2xl bg-base-200 text-sm">
                    <span className="loading loading-dots loading-xs"></span>
                  </div>
                </div>
              )}
            </div>

            <div className="px-5 py-4 border-t border-base-300 flex gap-2">
              <input
                type="text"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask about your journal..."
                className="input input-bordered input-sm flex-1"
                disabled={isLoading}
              />
              <button
                onClick={handleAsk}
                disabled={isLoading || !question.trim()}
                className="btn btn-primary btn-sm"
              >
                Ask
              </button>
            </div>

          </div>
        </div>
      )}
    </>
  );
};

export default AskJournal;
