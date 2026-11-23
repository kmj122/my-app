import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

// 자동 테스트 설정: tests 폴더의 *.test.ts 파일을 실행합니다.
export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
  },
});
