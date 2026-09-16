import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  /* 테스트는 Tailwind를 거치지 않는다 — postcss.config.mjs를 그대로 쓰면 @tailwindcss/postcss가
     lightningcss 네이티브 바이너리를 찾는데, macOS에서 만든 lockfile에는 리눅스용 optional
     의존성이 없어 CI(npm ci)에서 "Cannot find module '../lightningcss.linux-x64-gnu.node'"로
     죽었다. CSS 모듈 변환은 vite가 직접 하므로 postcss 없이도 필요한 건 다 나온다. */
  css: { postcss: { plugins: [] } },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
  },
})
