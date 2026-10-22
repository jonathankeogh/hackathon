import { useEffect, useState } from "react";
import { Label, Notice, Screen } from "../design";
import { ChatSection } from "./ChatSection";
import { OpenAsk } from "./OpenAsk";
import { PlanIdeas } from "./PlanIdeas";
import { RunSheet } from "./RunSheet";
import { Settings } from "./Settings";
import { TopBar } from "./TopBar";
import { openAskOf, runSheet } from "./adminModel";
import { useAdminActions, type Emit } from "./useAdminActions";
import type { AdminConnection } from "./useAdminConnection";
import { useWakeLock } from "./useWakeLock";
import "./admin.css";

export interface AdminPanelProps {
  conn: AdminConnection;
  emit: Emit;
  /** Dev preview: buttons look and toast as usual but nothing is sent. */
  preview?: boolean;
}

/** The presenter's control panel. Pure of sockets: the connection and `emit` come in as props. */
export function AdminPanel({ conn, emit, preview = false }: AdminPanelProps) {
  const { state, connected, denied, locked, callTarget, announced } = conn;
  const { run, pushToast, toast, isPending } = useAdminActions({ emit, connected, preview });
  const [called, setCalled] = useState(false);
  useWakeLock();

  useEffect(() => {
    if (announced) pushToast("info", announced.text);
  }, [announced, pushToast]);
  useEffect(() => {
    if (denied) pushToast("error", "Not allowed, the server refused that");
  }, [denied, pushToast]);
  // A reset or a fresh plan starts the call beat over.
  const planId = state?.plan?.id;
  useEffect(() => setCalled(false), [planId]);

  const offline = !connected;
  const act = { run, isPending, offline };

  if (!state) {
    return (
      <Screen>
        <TopBar state={null} connected={connected} toast={toast} />
        <Notice tone="warn">{connected ? "Waiting for the first state from the server" : "Connecting to the server"}</Notice>
        {denied ? <DeniedNote locked={locked} /> : null}
      </Screen>
    );
  }

  const target = state.people.find((p) => p.id === callTarget);
  const beats = runSheet(state, { called, callTargetName: target?.name ?? null });
  const askOpen = Boolean(openAskOf(state));

  return (
    <Screen width="wide">
      <TopBar state={state} connected={connected} toast={toast} />
      {denied ? <DeniedNote locked={locked} /> : null}
      {offline ? <Notice tone="error">Offline. Buttons are paused until the connection is back.</Notice> : null}
      <div className="ad-layout">
        <div className="ad-ask-slot">
          <OpenAsk state={state} act={act} />
        </div>
        <section className="ad-panel ad-sheet-panel" aria-label="Run sheet">
          <Label>Run sheet</Label>
          {state.suggestion ? <PlanIdeas suggestion={state.suggestion} act={act} /> : null}
          <RunSheet beats={beats} act={act} askOpen={askOpen} onCalled={() => setCalled(true)} />
        </section>
        <div className="ad-side">
          <section className="ad-panel" aria-label="Chat">
            <Label>Chat</Label>
            <ChatSection state={state} act={act} />
          </section>
          <Settings state={state} act={act} callTarget={callTarget} />
        </div>
      </div>
    </Screen>
  );
}

function DeniedNote({ locked }: { locked: boolean }) {
  return <Notice tone="error">Not allowed. Open /admin?key=... with the server's ADMIN_KEY{locked ? "" : " and reload"}.</Notice>;
}
