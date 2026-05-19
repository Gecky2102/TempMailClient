import Shell from "@/components/Shell";
import MessageView from "@/components/MessageView";

export default async function MessagePage({ params }: { params: Promise<{ mailbox: string; id: string }> }) {
  const { mailbox, id } = await params;
  return (
    <Shell>
      <MessageView mailbox={decodeURIComponent(mailbox)} id={decodeURIComponent(id)} />
    </Shell>
  );
}
