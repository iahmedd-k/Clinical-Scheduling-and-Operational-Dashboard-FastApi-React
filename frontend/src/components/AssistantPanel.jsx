import { useState } from "react";
import { MessageCircle, Send, X } from "lucide-react";
import { ActionButton, EmptyState } from "./ui";

function renderInline(text) {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
  return parts.map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={index}>{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith("`") && part.endsWith("`")) {
      return <code key={index} className="rounded bg-slate-100 px-1 py-0.5 text-[12px] text-slate-700">{part.slice(1, -1)}</code>;
    }
    return part;
  });
}

function AssistantMessage({ text }) {
  const lines = String(text || "").replace(/\r\n/g, "\n").split("\n");
  const blocks = [];
  let list = [];
  let listType = null;

  const flushList = () => {
    if (!list.length) return;
    const List = listType === "ordered" ? "ol" : "ul";
    blocks.push(
      <List key={`list-${blocks.length}`} className={`${listType === "ordered" ? "list-decimal" : "list-disc"} space-y-1 pl-5`}>
        {list.map((item, index) => <li key={index}>{renderInline(item)}</li>)}
      </List>,
    );
    list = [];
    listType = null;
  };

  lines.forEach((line, index) => {
    const value = line.trim();
    const bullet = value.match(/^[-*]\s+(.+)$/);
    const numbered = value.match(/^\d+[.)]\s+(.+)$/);
    if (bullet || numbered) {
      const nextType = numbered ? "ordered" : "unordered";
      if (listType && listType !== nextType) flushList();
      listType = nextType;
      list.push((bullet || numbered)[1]);
      return;
    }

    flushList();
    if (!value) return;
    if (/^#{1,3}\s+/.test(value)) {
      blocks.push(<h4 key={`heading-${index}`} className="text-[13px] font-bold text-slate-950">{renderInline(value.replace(/^#{1,3}\s+/, ""))}</h4>);
      return;
    }
    blocks.push(<p key={`paragraph-${index}`}>{renderInline(value)}</p>);
  });
  flushList();

  return <div className="space-y-2.5 text-[13px] leading-6 text-slate-800">{blocks}</div>;
}

function CitationList({ citations }) {
  if (!citations?.length) return null;
  return (
    <div className="mt-3 border-t border-slate-100 pt-2.5">
      <p className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">Sources</p>
      <div className="space-y-1.5">
        {citations.map((citation, index) => (
          <div key={`${citation.service_id || citation.appointment_id || index}-${index}`} className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 px-2.5 py-1.5 text-[11px]">
            <span className="min-w-0 truncate font-semibold text-slate-700">{citation.service_name || citation.source || "Appointment record"}</span>
            {citation.department ? <span className="shrink-0 text-slate-500">{citation.department}</span> : null}
          </div>
        ))}
      </div>
    </div>
  );
}

export function AssistantPanel({ open, onClose, onAsk, busy, conversation }) {
  const [question, setQuestion] = useState("");

  if (!open) return null;

  const submit = async (event) => {
    event.preventDefault();
    const next = question.trim();
    if (!next || busy) return;
    setQuestion("");
    await onAsk(next);
  };

  return (
    <aside className="fixed right-4 top-[76px] z-50 flex h-[min(640px,calc(100dvh-96px))] w-[390px] max-w-[calc(100vw-1.5rem)] flex-col rounded-[28px] border border-slate-200 bg-white/95 p-4 shadow-[0_24px_80px_rgba(15,23,42,0.18)] backdrop-blur-xl">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#0f766e]">Care navigator</p>
          <h3 className="mt-2 text-[18px] font-semibold tracking-[-0.02em] text-slate-950">Ask the assistant</h3>
        </div>
        <button type="button" aria-label="Close assistant" onClick={onClose} className="grid h-8 w-8 place-items-center rounded-full border border-slate-200 text-slate-500">
          <X size={16} />
        </button>
      </div>
      <p className="mt-2 text-[12px] leading-5 text-slate-500">Ask about services, booking, or clinic navigation. Answers stay grounded in published catalog data.</p>

      <div className="mt-4 min-h-0 flex-1 space-y-3 overflow-auto pr-1">
        {conversation.length ? (
          conversation.map((entry) => (
            <article key={entry.id} className={`rounded-[18px] px-4 py-3 ${entry.role === "user" ? "bg-[#e7f5f2] text-[#0f766e]" : "border border-slate-200 bg-white"}`}>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em]">{entry.role === "user" ? "You" : "Assistant"}</p>
              <div className="mt-1"><AssistantMessage text={entry.text} /></div>
              {entry.role === "assistant" ? <CitationList citations={entry.citations} /> : null}
            </article>
          ))
        ) : (
          <EmptyState icon={MessageCircle} title="Start a conversation" detail="Try “What cardiology services are available?” or “How do I reschedule?”" />
        )}
      </div>

      <form onSubmit={submit} className="mt-3 flex gap-2">
        <input
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          placeholder="Ask a clinical navigation question"
          className="min-h-11 flex-1 rounded-[16px] border border-slate-200 px-4 text-sm outline-none focus:border-[#0f766e] focus:ring-4 focus:ring-emerald-100"
        />
        <ActionButton type="submit" disabled={busy || !question.trim()}>
          <Send size={14} />
          {busy ? "..." : "Ask"}
        </ActionButton>
      </form>
    </aside>
  );
}
