import { app, shell, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'

/** 登录卡片窗口尺寸：380×500 卡片 + 透明留白用于阴影 */
const LOGIN_WIDTH = 420
const LOGIN_HEIGHT = 548

let loginWindow: BrowserWindow | null = null
let mainWindow: BrowserWindow | null = null

const preloadScript = join(__dirname, '../preload/index.js')
const rendererUrl = process.env['ELECTRON_RENDERER_URL']
const rendererFile = join(__dirname, '../renderer/index.html')

function loadRoute(window: BrowserWindow, hash: string, query?: Record<string, string>): void {
  if (is.dev && rendererUrl) {
    const search = query ? `?${new URLSearchParams(query).toString()}` : ''
    void window.loadURL(`${rendererUrl}${search}#${hash}`)
    return
  }
  void window.loadFile(rendererFile, { query, hash })
}

function attachExternalLinks(window: BrowserWindow): void {
  window.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })
}

/**
 * 登录窗口：无边框 + 透明背景，只显示一张卡片（对标 QQ / 微信 / 企业微信）。
 * 圆角与阴影由渲染进程 CSS 绘制，窗口本身不画背景。
 */
function createLoginWindow(): void {
  if (loginWindow && !loginWindow.isDestroyed()) {
    loginWindow.show()
    loginWindow.focus()
    return
  }

  loginWindow = new BrowserWindow({
    width: LOGIN_WIDTH,
    height: LOGIN_HEIGHT,
    show: false,
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    hasShadow: false,
    resizable: false,
    maximizable: false,
    fullscreenable: false,
    autoHideMenuBar: true,
    center: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: preloadScript,
      sandbox: false
    }
  })

  loginWindow.once('ready-to-show', () => loginWindow?.show())
  loginWindow.on('closed', () => {
    loginWindow = null
  })
  attachExternalLinks(loginWindow)

  loadRoute(loginWindow, '/login', { loginWindow: '1', platform: process.platform })
}

/** 主窗口：登录成功后创建，保留系统标题栏 */
function createMainWindow(): void {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.show()
    mainWindow.focus()
    return
  }

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 960,
    minHeight: 640,
    show: false,
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: preloadScript,
      sandbox: false
    }
  })

  mainWindow.once('ready-to-show', () => mainWindow?.show())
  mainWindow.on('closed', () => {
    mainWindow = null
  })
  attachExternalLinks(mainWindow)

  loadRoute(mainWindow, '/chats')
}

function registerIpc(): void {
  ipcMain.on('ping', () => console.log('pong'))

  // 渲染进程 HTTP 代理：绕过浏览器 CORS，统一在后端请求层处理超时
  ipcMain.handle(
    'api:request',
    async (
      _event,
      payload: {
        url: string
        method?: string
        headers?: Record<string, string>
        body?: unknown
        timeout?: number
      }
    ): Promise<{ ok: boolean; status: number; text: string; error?: string }> => {
      if (!payload?.url || !/^https?:\/\//i.test(payload.url)) {
        return { ok: false, status: 0, text: '', error: 'invalid url' }
      }

      const timeout = Math.min(Math.max(payload.timeout ?? 15000, 1000), 60000)
      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), timeout)

      try {
        const response = await fetch(payload.url, {
          method: payload.method ?? 'GET',
          headers: payload.headers,
          body: payload.body === undefined ? undefined : JSON.stringify(payload.body),
          signal: controller.signal
        })
        return { ok: response.ok, status: response.status, text: await response.text() }
      } catch (error) {
        return {
          ok: false,
          status: 0,
          text: '',
          error: error instanceof Error ? error.message : String(error)
        }
      } finally {
        clearTimeout(timer)
      }
    }
  )

  // 文件上传：渲染进程把文件二进制传到主进程，由主进程组装 multipart 绕过 CORS
  ipcMain.handle(
    'api:upload',
    async (
      _event,
      payload: {
        url: string
        token?: string
        fileName?: string
        contentType?: string
        data: ArrayBuffer
        fields?: Record<string, string>
        timeout?: number
      }
    ): Promise<{ ok: boolean; status: number; text: string; error?: string }> => {
      if (!payload?.url || !/^https?:\/\//i.test(payload.url)) {
        return { ok: false, status: 0, text: '', error: 'invalid url' }
      }

      const timeout = Math.min(Math.max(payload.timeout ?? 30000, 1000), 120000)
      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), timeout)

      try {
        const form = new FormData()
        for (const [key, value] of Object.entries(payload.fields ?? {})) {
          form.append(key, value)
        }
        form.append(
          'file',
          new Blob([new Uint8Array(payload.data)], {
            type: payload.contentType || 'application/octet-stream'
          }),
          payload.fileName || 'file'
        )
        const response = await fetch(payload.url, {
          method: 'POST',
          headers: payload.token ? { Authorization: `Bearer ${payload.token}` } : undefined,
          body: form,
          signal: controller.signal
        })
        return { ok: response.ok, status: response.status, text: await response.text() }
      } catch (error) {
        return {
          ok: false,
          status: 0,
          text: '',
          error: error instanceof Error ? error.message : String(error)
        }
      } finally {
        clearTimeout(timer)
      }
    }
  )

  // 登录成功：先创建主窗口，再关闭登录卡片，避免中间出现“无窗口”状态
  ipcMain.on('auth:login', () => {
    createMainWindow()
    if (loginWindow && !loginWindow.isDestroyed()) loginWindow.close()
  })

  // 退出登录：先创建登录窗口，再关闭主窗口
  ipcMain.on('auth:logout', () => {
    createLoginWindow()
    if (mainWindow && !mainWindow.isDestroyed()) mainWindow.close()
  })

  ipcMain.on('window:minimize', (event) => {
    BrowserWindow.fromWebContents(event.sender)?.minimize()
  })

  ipcMain.on('window:close', (event) => {
    BrowserWindow.fromWebContents(event.sender)?.close()
  })
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.electron')

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  registerIpc()
  createLoginWindow()

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createLoginWindow()
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
