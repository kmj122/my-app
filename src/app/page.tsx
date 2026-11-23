// 한 페이지(/) 위쪽에 탭 4개를 두고 화면을 바꾼다. (PLAN 9번)
// 화면 ①~④의 내용은 PLAN 10~13번에서 하나씩 만든다.
import { AppTabs } from "@/components/AppTabs";
import { AppStateProvider } from "@/state/AppStateProvider";

export default function Home() {
  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-6">
      <h1 className="mb-4 text-2xl font-bold tracking-tight">ATHLETE SIGNAL</h1>
      <AppStateProvider>
        <AppTabs />
      </AppStateProvider>
    </main>
  );
}
