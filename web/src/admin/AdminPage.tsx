import { useMemo } from "react";
import { AdminPanel } from "./AdminPanel";
import { readAdminMock } from "./devMock";
import { liveEmit, useAdminConnection } from "./useAdminConnection";

const noEmit = () => undefined;

function LiveAdmin() {
  const conn = useAdminConnection();
  return <AdminPanel conn={conn} emit={liveEmit} />;
}

/**
 * /admin, the presenter's control panel. In dev, `?mock=idle|blocked|ask|ideas|viable|booked|offline|denied`
 * previews it without touching the socket; otherwise it is the live panel.
 */
export default function AdminPage() {
  const mock = useMemo(() => readAdminMock(window.location.search), []);
  return mock ? <AdminPanel conn={mock} emit={noEmit} preview /> : <LiveAdmin />;
}
