import Shell from "@/components/Shell";
import MessageList from "@/components/MessageList";

export default function InboxPage() {
  return (
    <Shell>
      <div className="border-b px-4 py-3" style={{ borderColor: "var(--border)" }}>
        <h1 className="text-base font-medium">Tutte le caselle</h1>
        <p className="text-xs muted">Messaggi unificati dalle caselle attive</p>
      </div>
      <MessageList />
    </Shell>
  );
}
