import { useCallback, useEffect, useMemo, useState } from "react";
import { socket } from "../socket";
import { useServerState } from "../useServerState";
import type { PlanOption } from "@deadlock/shared/types";
import { buzz, isLineClear, openSuggestion, selectScreen, type JoinModel, type Role, type Saved } from "./model";
import { load, save } from "./storage";

const JOIN_TIMEOUT_MS = 8000;

/**
 * The phone's real session: saved person id with a silent rejoin on every (re)connect, the
 * server events for this phone (invite, call, ask), and the actions the screens call.
 */
export function useJoinSession(): JoinModel {
  const { state, connected } = useServerState();
  const [me, setMe] = useState<Saved | null>(() => (load()?.personId ? load() : null));
  const [invite, setInvite] = useState<string | null>(null);
  const [call, setCall] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);
  const [answered, setAnswered] = useState<string | null>(null);
  const [chatDenied, setChatDenied] = useState(false);

  useEffect(() => {
    // Reattach silently on every (re)connect.
    const rejoin = () => {
      const saved = load();
      if (saved) socket.emit("join", { name: saved.name, personId: saved.personId });
    };
    const onJoined = ({ personId }: { personId: string }) => {
      setMe((prev) => {
        const next: Saved = { personId, name: prev?.name ?? load()?.name ?? "", role: prev?.role ?? load()?.role };
        save(next);
        return next;
      });
    };
    const onInvite = ({ text }: { text: string }) => {
      setInvite(text);
      buzz([80, 40, 80]);
    };
    const onCall = ({ script }: { script: string }) => setCall(script);
    const onDenied = () => setChatDenied(true);

    if (socket.connected) rejoin();
    socket.on("connect", rejoin);
    socket.on("joined", onJoined);
    socket.on("invite", onInvite);
    socket.on("call", onCall);
    socket.on("admin:denied", onDenied);
    return () => {
      socket.off("connect", rejoin);
      socket.off("joined", onJoined);
      socket.off("invite", onInvite);
      socket.off("call", onCall);
      socket.off("admin:denied", onDenied);
    };
  }, []);

  // After an admin reset our id is gone: go back to the join screen.
  useEffect(() => {
    if (me && state && !state.people.some((p) => p.id === me.personId)) {
      save(null);
      setMe(null);
      setInvite(null);
      setJoining(false);
      setCall(null);
      window.speechSynthesis?.cancel();
    }
  }, [me, state]);

  // A join the server never answers must not leave the button spinning for ever.
  useEffect(() => {
    if (!joining) return;
    const id = window.setTimeout(() => setJoining(false), JOIN_TIMEOUT_MS);
    return () => window.clearTimeout(id);
  }, [joining]);

  // The agent's question to this person, straight from state so a refresh keeps it.
  const ask = useMemo(
    () => (me ? (state?.asks?.find((a) => a.personId === me.personId && a.status === "open" && a.id !== answered) ?? null) : null),
    [me, state?.asks, answered],
  );
  useEffect(() => {
    if (ask) buzz([120, 80, 120]);
  }, [ask?.id]);

  // Every joined phone in the room turns green together when the line clears.
  const lineClear = isLineClear({ me, invite, state });
  useEffect(() => {
    if (lineClear) buzz(300);
  }, [lineClear]);

  // The bot's plan ideas: buzz once per suggestion id, only for a phone that has joined.
  const suggestion = me ? openSuggestion(state) : null;
  useEffect(() => {
    if (suggestion) buzz([120, 80, 120]);
  }, [suggestion?.id]);

  const join = useCallback((name: string) => {
    const clean = name.trim();
    if (!clean) return;
    setJoining(true);
    save({ personId: "", name: clean });
    socket.emit("join", { name: clean });
  }, []);

  const chooseRole = useCallback(
    (role: Role) => {
      if (!me) return;
      const next = { ...me, role };
      save(next);
      setMe(next);
      socket.emit("rsvp", { personId: me.personId, role });
    },
    [me],
  );

  const answerAsk = useCallback(
    (accept: boolean) => {
      if (!ask || !me) return;
      setAnswered(ask.id);
      socket.emit("ask:answer", { askId: ask.id, accept, personId: me.personId });
    },
    [ask, me],
  );

  const voteSuggestion = useCallback(
    (option: PlanOption["id"]) => {
      if (me) socket.emit("suggest:vote", { personId: me.personId, option });
    },
    [me],
  );

  const endCall = useCallback(() => {
    window.speechSynthesis?.cancel();
    setCall(null);
  }, []);

  const sendChat = useCallback(
    (text: string) => {
      if (me && text.trim()) socket.emit("chat:send", { personId: me.personId, text: text.trim() });
    },
    [me],
  );

  const screen = selectScreen({ call, me, ask, invite, state });
  return { screen, state, connected, me, ask, invite, call, joining, chatDenied, suggestion, join, chooseRole, answerAsk, endCall, sendChat, voteSuggestion };
}
