"use client";

import { AppStateProvider, useAppState } from "@/state/AppStateProvider";
import AppTabs from "./AppTabs";
import AthleteDetail from "./AthleteDetail";
import MeasurementInput from "./MeasurementInput";
import ProtocolSettings from "./ProtocolSettings";
import TeamResultTable from "./TeamResultTable";

function Screens() {
  const { tab } = useAppState();
  return (
    <div className="mt-6">
      {tab === "settings" && <ProtocolSettings />}
      {tab === "input" && <MeasurementInput />}
      {tab === "results" && <TeamResultTable />}
      {tab === "detail" && <AthleteDetail />}
    </div>
  );
}

export default function AppShell() {
  return (
    <AppStateProvider>
      <div className="mx-auto w-full max-w-6xl px-4 py-6">
        <header className="mb-4">
          <h1 className="text-2xl font-bold tracking-tight">ATHLETE SIGNAL</h1>
          <p className="text-sm text-slate-600">
            반동점프(CMJ) 기록 변화를 측정 오차 기준과 중요 변화 기준으로 분석합니다.
          </p>
        </header>
        <AppTabs />
        <Screens />
      </div>
    </AppStateProvider>
  );
}
