/// <reference types="vitest/config" />
import vueJsx from '@vitejs/plugin-vue-jsx'
import { defineConfig, UserConfig } from 'vite'
import electron from 'vite-plugin-electron'
import { collectUnusedCssVariables } from './build/collectUnusedCssVariables'
import { svgLoader } from './build/svgLoader'

// Electron 44: Chromium 152, Node.js 24
const RENDERER_TARGET = 'chrome152'
const MAIN_TARGET = 'node24'

/** Сборка main-процесса и preload-скриптов: все они лежат в app/ рядом с dist */
function electronEntry(entry: string, target: string) {
  return {
    entry,
    vite: {
      build: {
        target,
        outDir: 'app',
        reportCompressedSize: false
      }
    }
  }
}

export default defineConfig(async ({ mode }) => ({
  build: {
    target: RENDERER_TARGET,
    modulePreload: {
      polyfill: false
    },
    outDir: 'app/dist',
    reportCompressedSize: false,
    rollupOptions: {
      // Второе окно — всплывающие уведомления, у него своя точка входа без стора и лонгпола
      input: {
        index: 'index.html',
        notification: 'notification.html'
      }
    }
  },
  resolve: {
    tsconfigPaths: true
  },
  define: {
    __VUE_OPTIONS_API__: false,
    __VUE_PROD_HYDRATION_MISMATCH_DETAILS__: false,
    __IS_MACOS__: process.platform === 'darwin'
  },
  plugins: [
    vueJsx({
      include: /\.tsx$/
    }),
    svgLoader({
      defaultImport: 'component'
    }),
    electron([
      electronEntry('main-process/index.ts', MAIN_TARGET),
      // Preload-скрипты выполняются в песочнице рендерера: только contextBridge и ipcRenderer
      {
        ...electronEntry('main-process/preload.ts', RENDERER_TARGET),
        onstart({ reload }) {
          reload()
        }
      },
      {
        ...electronEntry('main-process/notificationPreload.ts', RENDERER_TARGET),
        onstart({ reload }) {
          reload()
        }
      }
    ])
  ],
  css: {
    transformer: mode === 'production' ? 'lightningcss' : undefined,
    lightningcss: {
      unusedSymbols: mode === 'production' ? await collectUnusedCssVariables(mode) : undefined
    }
  },
  test: {
    /*
      Без изоляции воркер держит один реестр модулей на все файлы разом, и файл,
      подменивший services или electron через vi.mock, получал уже загруженный
      чужой копией модуль. Набор от этого падал примерно раз в шесть прогонов,
      причём каждый раз в разном месте. Изоляция стоит около секунды на весь набор
    */
    isolate: true,
    pool: 'threads'
  }
}) satisfies UserConfig)
