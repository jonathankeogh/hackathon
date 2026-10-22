import { CHAT } from "./content";
import type { Story } from "./storyMap";

/** The WhatsApp group. Messages arrive as the story reaches them; the agent types its question out. */
export function ChatColumn({ story }: { story: Story }) {
  const sent = story.messages.filter((m) => m.appear > 0);
  const typing = story.messages.find((m) => m.id === "ask");
  const typingNow = typing !== undefined && typing.appear > 0 && typing.text.length < CHAT.find((c) => c.id === "ask")!.text.length;
  return (
    <div className="lp-chat">
      <p className="lp-chat-head">
        <span>WhatsApp</span>
        <span className="lp-chat-group">Workshop crew</span>
      </p>
      {sent.length === 0 ? <p className="lp-chat-empty">Nobody has said anything yet.</p> : null}
      <ul className="lp-chat-list">
        {sent.map((m) => {
          const line = CHAT.find((c) => c.id === m.id)!;
          return (
            <li key={m.id} className="lp-msg" data-kind={line.kind} style={{ opacity: m.appear, transform: `translateY(${Math.round((1 - m.appear) * 14)}px)` }}>
              <span className="lp-msg-who">{line.who}</span>
              <span className="lp-msg-text">
                {m.text}
                {m.id === "ask" && typingNow ? <span className="lp-caret" aria-hidden /> : null}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
