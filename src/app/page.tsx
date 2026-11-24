// 한 페이지(/) 위쪽에 메뉴 3개(기록 입력 / 팀 결과 / 분석 설정)를 두고 화면을 바꾼다.
import { AppTabs } from "@/components/AppTabs";
import { AppStateProvider } from "@/state/AppStateProvider";

export default function Home() {
  return (
    <>
      <header className="bg-navy-900 text-white shadow-md">
        <div className="mx-auto flex w-full max-w-6xl items-center gap-3 px-4 py-4">
          <span aria-hidden="true" className="grid h-9 w-9 place-items-center rounded-xl bg-blue-500 text-lg font-bold">
            ↑
          </span>
          <h1 className="text-xl font-bold tracking-tight sm:text-2xl">체력측정</h1>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl px-4 py-6">
        <AppStateProvider>
          <AppTabs />
        </AppStateProvider>
      </main>
    </>
  );
}
