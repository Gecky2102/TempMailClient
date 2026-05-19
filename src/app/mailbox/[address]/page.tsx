import Shell from "@/components/Shell";
import MessageList from "@/components/MessageList";

export default async function MailboxPage({ params }: { params: Promise<{ address: string }> }) {
  const { address } = await params;
  const decoded = decodeURIComponent(address);
  return (
    <Shell>
      <div className="border-b px-4 py-3" style={{ borderColor: "var(--border)" }}>
        <h1 className="text-base font-medium break-all">{decoded}</h1>
        <p className="text-xs muted">Casella singola</p>
      </div>
      <MessageList filterAddress={decoded} />
    </Shell>
  );
}
