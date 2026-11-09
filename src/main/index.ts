import { app, shell, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'

/** 登录卡片窗口尺寸：380×500 卡片 + 透明留白用于阴影 */
const LOGIN_WIDTH = 420
const LOGIN_HEIGHT = 548
/** 主窗口与 Agent 主窗口共用同一套尺寸，保证界面与用户页面完全一致 */
const MAIN_WIDTH = 1280
const MAIN_HEIGHT = 800
const MAIN_MIN_WIDTH = 960
const MAIN_MIN_HEIGHT = 640

let loginWindow: BrowserWindow | null = null
let mainWindow: BrowserWindow | null = null
/** 独立会话窗口：conversationId -> BrowserWindow */
const popoutWindows = new Map<string, BrowserWindow>()
/** Agent 主窗口：agentId -> BrowserWindow（每个 Agent 一个完整主界面窗口） */
const agentWindows = new Map<string, BrowserWindow>()

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
    if (mainWindow.isMinimized()) mainWindow.restore()
    mainWindow.show()
    mainWindow.focus()
    return
  }

  mainWindow = new BrowserWindow({
    width: MAIN_WIDTH,
    height: MAIN_HEIGHT,
    minWidth: MAIN_MIN_WIDTH,
    minHeight: MAIN_MIN_HEIGHT,
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

/**
 * Agent 主窗口：与用户主窗口完全相同的布局与尺寸，但以该 Agent 身份运行。
 * 同一个 Agent 重复打开时只聚焦已有窗口。
 */
function createAgentWindow(agentId: string): void {
  const id = typeof agentId === 'string' ? agentId.trim() : ''
  if (!id || !/^[a-zA-Z0-9_-]{1,64}$/.test(id)) return

  const existed = agentWindows.get(id)
  if (existed && !existed.isDestroyed()) {
    if (existed.isMinimized()) existed.restore()
    existed.show()
    existed.focus()
    return
  }

  const window = new BrowserWindow({
    width: MAIN_WIDTH,
    height: MAIN_HEIGHT,
    minWidth: MAIN_MIN_WIDTH,
    minHeight: MAIN_MIN_HEIGHT,
    show: false,
    center: true,
    autoHideMenuBar: true,
    title: '野火IM · Agent',
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: preloadScript,
      sandbox: false
    }
  })

  agentWindows.set(id, window)
  window.once('ready-to-show', () => window.show())
  window.on('closed', () => agentWindows.delete(id))
  attachExternalLinks(window)
  loadRoute(window, '/chats', { agentWindow: '1', agentId: id })
}

/** 为单个会话打开独立窗口，重复打开会聚焦已有窗口；agentId 用于沿用 Agent 身份 */
function createPopoutWindow(conversationId: string, agentId = ''): void {
  const id = typeof conversationId === 'string' ? conversationId.trim() : ''
  if (!id || !/^[a-zA-Z0-9:_-]{1,64}$/.test(id)) return
  const agent = typeof agentId === 'string' ? agentId.trim() : ''
  const windowKey = agent ? `${agent}:${id}` : id

  const existed = popoutWindows.get(windowKey)
  if (existed && !existed.isDestroyed()) {
    if (existed.isMinimized()) existed.restore()
    existed.show()
    existed.focus()
    return
  }

  const window = new BrowserWindow({
    width: 840,
    height: 600,
    minWidth: 520,
    minHeight: 400,
    show: false,
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: preloadScript,
      sandbox: false
    }
  })

  popoutWindows.set(windowKey, window)
  window.once('ready-to-show', () => window.show())
  window.on('closed', () => popoutWindows.delete(windowKey))
  attachExternalLinks(window)
  loadRoute(window, `/popout/${id}`, agent ? { agentWindow: '1', agentId: agent } : undefined)
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

  // 退出登录：先创建登录窗口，再关闭主窗口、所有 Agent 窗口和独立会话窗口
  ipcMain.on('auth:logout', () => {
    createLoginWindow()
    for (const window of popoutWindows.values()) {
      if (!window.isDestroyed()) window.close()
    }
    popoutWindows.clear()
    for (const window of agentWindows.values()) {
      if (!window.isDestroyed()) window.close()
    }
    agentWindows.clear()
    if (mainWindow && !mainWindow.isDestroyed()) mainWindow.close()
  })

  // 兼容旧格式：独立会话窗口可携带 agentId 以沿用 Agent 身份
  ipcMain.on(
    'window:open-popout',
    (_event, payload: { conversationId: string; agentId?: string } | string) => {
      if (typeof payload === 'string') {
        createPopoutWindow(payload)
        return
      }
      createPopoutWindow(payload?.conversationId, payload?.agentId)
    }
  )

  // 以某个 Agent 身份打开一个与用户主窗口一致的新主窗口
  ipcMain.on('window:open-agent', (_event, agentId: string) => {
    createAgentWindow(agentId)
  })

  // Agent 窗口切回用户账号：聚焦（必要时重建）用户主窗口
  ipcMain.on('window:focus-main', () => {
    createMainWindow()
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
