/**
 * dsh-better-hud — Host half.
 *
 * v0.1.0（探针 + 首版数据）：
 *   - /api/dsh-better-hud/summary  顶部栏数据（余额 / 今日已用 / 峰谷 / 平台链接）
 *   - /api/dsh-better-hud/turn     每轮消耗（按 messageId 查真实 usage × 价目表）
 *
 * 设计约束：
 *   - 不写 session 日志、不加工具、不碰凭据；只读 deepseekAccount / sessions。
 *   - 账本落盘到 DSH_HOME/usage-hud/ledger.json（临时文件 + rename 原子写，坏文件改名 .bak 重建）。
 *   - 所有入口 try/catch：Host 半身绝不能让宿主起不来。
 */

import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const VERSION = '0.1.0'
const PLUGIN = 'dsh-better-hud'

/** 账本位置：沿用 DSH_HOME（默认 ~/.dsh）。 */
const DSH_HOME = process.env.DSH_HOME || path.join(os.homedir(), '.dsh')
const LEDGER_DIR = path.join(DSH_HOME, 'usage-hud')
const LEDGER_FILE = path.join(LEDGER_DIR, 'ledger.json')
const LEDGER_VERSION = 1
const LEDGER_KEEP_DAYS = 120

/* ── 顶栏显示设置（落盘）───────────────────────────────────────── */
const SETTINGS_FILE = path.join(LEDGER_DIR, 'settings.json')
const KNOWN_ITEMS = ['balance', 'today', 'peak']
const DEFAULT_SETTINGS = { version: 1, enabled: true, items: ['balance', 'today', 'peak'], turnCost: true, hideBalanceForNonOfficial: true }
let settingsCache = null

function sanitizeSettings(input, base) {
  const fallback = base || DEFAULT_SETTINGS
  const enabled = input && typeof input.enabled === 'boolean' ? input.enabled : fallback.enabled
  const source = input && Array.isArray(input.items) ? input.items : fallback.items
  const items = [...new Set(source.filter((item) => KNOWN_ITEMS.includes(item)))]
  const turnCost = input && typeof input.turnCost === 'boolean' ? input.turnCost : fallback.turnCost
  const hideBalanceForNonOfficial = input && typeof input.hideBalanceForNonOfficial === 'boolean'
    ? input.hideBalanceForNonOfficial
    : fallback.hideBalanceForNonOfficial
  return { version: 1, enabled, items, turnCost, hideBalanceForNonOfficial }
}

function loadSettings() {
  if (settingsCache) return settingsCache
  try {
    settingsCache = sanitizeSettings(JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf8')), DEFAULT_SETTINGS)
  } catch (error) {
    settingsCache = { ...DEFAULT_SETTINGS, items: [...DEFAULT_SETTINGS.items] }
  }
  return settingsCache
}

function saveSettings(input) {
  const next = sanitizeSettings(input, loadSettings())
  settingsCache = next
  try {
    fs.mkdirSync(LEDGER_DIR, { recursive: true })
    const body = JSON.stringify({ ...next, savedAt: Date.now() })
    const temp = SETTINGS_FILE + '.tmp'
    fs.writeFileSync(temp, body, 'utf8')
    fs.renameSync(temp, SETTINGS_FILE)
  } catch (error) { /* 设置落盘失败：内存里仍生效 */ }
  return next
}

/* ── 当前模型：只认 DeepSeek 官方通道 ─────────────────────────────
 * DSH 里官方通道只有两个 provider：deepseek-official（API key）和
 * deepseek-account（账号登录）。中转站/自定义渠道即使模型名相同，provider 也不同，
 * 一律按「非官方」处理（顶部余额隐藏）。
 */
const OFFICIAL_PROVIDERS = new Set(['deepseek-official', 'deepseek-account'])
let lastModel = null

function noteModelEvent(session, event) {
  try {
    const type = event && event.type
    const data = event && event.data
    if (!data) return
    // 子代理会话不参与：它们的模型事件会把顶部栏带偏。
    const header = session && session.header
    if (header && header.origin === 'subagent') return
    let provider = ''
    let model = ''
    if (type === 'model/selection' || type === 'request/context') {
      provider = data.provider
      model = data.model
    } else if (type === 'assistant/message') {
      const source = data.message && data.message.source
      provider = source && source.provider
      model = source && source.model
    } else {
      return
    }
    if (!provider && !model) return
    const at = Number(event.time) || Date.now()
    if (lastModel && at < lastModel.at) return
    lastModel = { provider: String(provider || ''), model: String(model || ''), at }
  } catch (error) { /* ignore */ }
}

function currentModelInfo() {
  if (!lastModel) return null
  return {
    provider: lastModel.provider,
    model: lastModel.model,
    official: OFFICIAL_PROVIDERS.has(lastModel.provider),
  }
}

/** 北京时间自然日（YYYY-MM-DD）。 */
function beijingDay(ms = Date.now()) {
  const d = new Date(Number(ms) + 8 * 3600 * 1000)
  return d.toISOString().slice(0, 10)
}

/** 北京时间（UTC+8）的星期与小时；与宿主时区无关。 */
function beijingParts(ms) {
  const d = new Date(Number(ms) + 8 * 3600 * 1000)
  return { dow: d.getUTCDay(), hour: d.getUTCHours(), minute: d.getUTCMinutes() }
}

/** 高峰：工作日（不含法定节假日）9:00–12:00、14:00–18:00（北京时间）。 */
const PEAK_HOURS = [[9, 12], [14, 18]]
/** 法定节假日全天谷价；每年国务院公布次年安排后在这里补一年。v0.1 先留空。 */
const HOLIDAYS = new Set([])

function isPeak(ms) {
  const p = beijingParts(ms)
  if (p.dow === 0 || p.dow === 6) return false
  if (HOLIDAYS.has(beijingDay(ms))) return false
  return PEAK_HOURS.some(([start, end]) => p.hour >= start && p.hour < end)
}

/** 下一个峰谷切换时刻（epoch ms）；按分钟扫描，切换点都在整分。 */
function nextPeakChangeAt(ms) {
  const base = Math.floor(Number(ms) / 60000) * 60000
  const cur = isPeak(base)
  for (let i = 1; i <= 8 * 24 * 60; i += 1) {
    const candidate = base + i * 60000
    if (isPeak(candidate) !== cur) return candidate
  }
  return null
}

/** 单价：CNY / 百万 token，[谷价, 峰价]。与 dsh-whale-widget 默认值对齐。 */
const PRICES = {
  'deepseek-flash': { hit: [0.02, 0.04], miss: [1, 2], out: [4, 8] },
  'deepseek-v4-pro': { hit: [0.15, 0.3], miss: [4.5, 9], out: [13.5, 27] },
}

function priceFor(model) {
  if (typeof model !== 'string' || model === '') return null
  // 旧名 deepseek-v4-flash / deepseek-v4-flash-vision-exp 也按 Flash 价计费。
  if (/flash/i.test(model)) return PRICES['deepseek-flash']
  if (/v4[-_.]?pro|reasoner/i.test(model)) return PRICES['deepseek-v4-pro']
  return null
}

/** 单条消息的消耗（元）。usage 缺失或模型未知时返回 null。 */
function costOf(usage, model, atMs) {
  const price = priceFor(model)
  if (!price || !usage) return null
  const idx = isPeak(atMs) ? 1 : 0
  // DSH 的 usage 桶是互斥的：total = input + cacheRead + cacheWrite + output。
  // （实测当前会话 123/123 条 assistant/message 都满足，且 inputTokens 很小、
  //  cacheReadTokens 很大，说明 inputTokens 不含缓存命中部分。）
  // 因此：inputTokens 全部按「未命中」价、cacheReadTokens 按「命中」价、output 按输出价。
  // cacheWriteTokens 现行 DeepSeek 价目表没有单独计价，按 0 处理（与 dsh-whale-widget 一致）。
  const hit = Math.max(0, Number(usage.cacheReadTokens) || 0)
  const input = Math.max(0, Number(usage.inputTokens) || 0)
  const output = Math.max(0, Number(usage.outputTokens) || 0)
  return (hit * price.hit[idx] + input * price.miss[idx] + output * price.out[idx]) / 1e6
}

/* ── 金额定点（避免浮点累计误差）────────────────────────────────── */

const SCALE = 1e8
const toUnits = (value) => Math.round(Number(value) * SCALE)
const fromUnits = (units) => units / SCALE

/** 余额观测账本：day -> 当天累计。 */
const ledger = new Map()

/** 一次性迁移：账本第一次落盘前，继承 whale 账本里“今天已观测消费”（只读、失败即跳过）。 */
let pendingImport = null

function readWhaleToday(day) {
  try {
    const file = path.join(DSH_HOME, '.dshw-usage.json')
    if (!fs.existsSync(file)) return null
    const parsed = JSON.parse(fs.readFileSync(file, 'utf8'))
    const accounting = parsed && parsed.accounting
    const books = accounting && accounting.books
    if (!books || !accounting.active) return null
    const book = books[accounting.active]
    const row = book && book.days && book.days[day]
    if (!row) return null
    return {
      units: Number(row.debitUnits) || 0,
      firstAt: Number(row.firstAt) || 0,
      lastAt: Number(row.lastAt) || 0,
    }
  } catch (error) {
    return null
  }
}

function loadLedger() {
  try {
    if (!fs.existsSync(LEDGER_FILE)) return
    const parsed = JSON.parse(fs.readFileSync(LEDGER_FILE, 'utf8'))
    if (!parsed || parsed.version !== LEDGER_VERSION || !parsed.days || typeof parsed.days !== 'object') return
    for (const [day, row] of Object.entries(parsed.days)) {
      if (!row || typeof row !== 'object') continue
      const next = {
        day,
        firstAt: Number(row.firstAt) || 0,
        lastAt: Number(row.lastAt) || 0,
        openingUnits: Number(row.openingUnits) || 0,
        lastUnits: Number(row.lastUnits) || 0,
        debitUnits: Number(row.debitUnits) || 0,
        creditUnits: Number(row.creditUnits) || 0,
        importedUnits: Number(row.importedUnits) || 0,
      }
      if (!next.firstAt || !next.lastAt) continue
      ledger.set(day, next)
    }
  } catch (error) {
    // 坏文件不锁死：改名备份，本进程从空账本继续（后续观测会重建）。
    try {
      if (fs.existsSync(LEDGER_FILE)) {
        fs.renameSync(LEDGER_FILE, LEDGER_FILE + '.corrupt-' + Date.now() + '.bak')
      }
    } catch (renameError) { /* 备份失败也不阻塞 */ }
  } finally {
    // 只有“今天还没有自己的观测行”时才继承 whale 的今日已观测消费。
    try {
      const today = beijingDay()
      if (!ledger.has(today)) {
        const imported = readWhaleToday(today)
        if (imported && imported.units > 0) pendingImport = { day: today, ...imported }
      }
    } catch (error) { /* ignore */ }
  }
}

function saveLedger() {
  try {
    fs.mkdirSync(LEDGER_DIR, { recursive: true })
    const days = {}
    for (const day of [...ledger.keys()].sort().slice(-LEDGER_KEEP_DAYS)) {
      days[day] = { ...ledger.get(day) }
    }
    const body = JSON.stringify({ version: LEDGER_VERSION, days, savedAt: Date.now() })
    const temp = LEDGER_FILE + '.tmp'
    fs.writeFileSync(temp, body, 'utf8')
    fs.renameSync(temp, LEDGER_FILE)
  } catch (error) {
    // 落盘失败不影响余额展示：下一轮观测会再试。
  }
}

function observe(day, at, amount) {
  const units = toUnits(amount)
  if (!Number.isFinite(units)) return null
  let row = ledger.get(day)
  if (!row) {
    row = { day, firstAt: at, lastAt: at, openingUnits: units, lastUnits: units, debitUnits: 0, creditUnits: 0, importedUnits: 0 }
    if (pendingImport && pendingImport.day === day) {
      row.importedUnits = pendingImport.units
      if (pendingImport.firstAt) row.firstAt = Math.min(row.firstAt, pendingImport.firstAt)
      pendingImport = null
    }
    ledger.set(day, row)
    saveLedger()
    return row
  }
  if (at < row.lastAt) return row
  const delta = row.lastUnits - units // >0 表示余额下降
  if (delta > 0) row.debitUnits += delta
  if (delta < 0) row.creditUnits -= delta
  row.lastUnits = units
  row.lastAt = at
  saveLedger()
  return row
}

/** 与 whale 同口径：已观测消费 = 当天累计下降；充值/赠金单列，不冲消费。 */
function todaySummary(now = Date.now()) {
  const day = beijingDay(now)
  const row = ledger.get(day)
  if (!row) return null
  const partial =
    row.firstAt - Date.parse(day + 'T00:00:00+08:00') > 10 * 60 * 1000
  return {
    day,
    amount: fromUnits(row.debitUnits + (row.importedUnits || 0)),
    currency: 'CNY',
    partialDay: partial,
    needsReview: row.creditUnits > 0,
    observedFrom: row.firstAt,
    observedTo: row.lastAt,
    source: 'balance-observed',
  }
}

/* ── HTTP ────────────────────────────────────────────────────────── */

function sendJson(res, status, value) {
  const body = JSON.stringify(value)
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    'content-length': Buffer.byteLength(body),
  })
  res.end(body)
}

/** 读取很小的 JSON 请求体；超限或解析失败返回 null。 */
function readJsonBody(req) {
  return new Promise((resolve) => {
    let size = 0
    const chunks = []
    req.on('data', (chunk) => {
      size += chunk.length
      if (size > 64 * 1024) {
        try { req.destroy() } catch (error) { /* ignore */ }
        resolve(null)
        return
      }
      chunks.push(chunk)
    })
    req.on('end', () => {
      try {
        const text = Buffer.concat(chunks).toString('utf8')
        resolve(text ? JSON.parse(text) : null)
      } catch (error) {
        resolve(null)
      }
    })
    req.on('error', () => resolve(null))
  })
}

export function apply(ctx) {
  const logger = (() => {
    try { return ctx.logger } catch { return undefined }
  })()

  try { loadLedger() } catch (error) { logger?.warn?.(`${PLUGIN}: ledger load failed: ${error?.message || error}`) }

  // 跟踪当前模型（不含子代理），供顶部栏判断是否显示余额。
  try {
    ctx.effect(() => ctx.on('session/event', (session, event) => noteModelEvent(session, event)), `${PLUGIN}: track current model`)
  } catch (error) {
    logger?.warn?.(`${PLUGIN}: model tracking failed: ${error?.message || error}`)
  }

  // 启动时补一次：从当前活着的会话日志里取最近的模型事件（否则重启后要等下一轮才知道模型）。
  try {
    const sessions = (() => { try { return ctx.get('sessions') } catch { return undefined } })()
    if (sessions && typeof sessions.list === 'function') {
      for (const session of sessions.list()) {
        const header = session && session.header
        if (header && header.origin === 'subagent') continue
        let events = []
        try { events = session.snapshotEvents() } catch (error) { continue }
        for (let index = events.length - 1; index >= 0 && index > events.length - 5000; index -= 1) {
          const type = events[index] && events[index].type
          if (type === 'model/selection' || type === 'request/context') {
            noteModelEvent(session, events[index])
            break
          }
        }
      }
    }
  } catch (error) { /* ignore */ }

  /** 账号服务是可选依赖：没登录/没这个服务时顶部栏只显示峰谷。 */
  function accountService() {
    try { return ctx.get('deepseekAccount') } catch { return undefined }
  }

  function clientMeta() {
    let locale = 'zh-CN'
    try {
      const l = ctx.get('locale')
      if (l && typeof l.getLocale === 'function') {
        const snap = l.getLocale()
        if (snap && typeof snap.id === 'string') locale = snap.id
      }
    } catch { /* 保持默认 */ }
    return {
      version: VERSION,
      locale,
      timezoneOffsetSeconds: -new Date().getTimezoneOffset() * 60,
    }
  }

  let balanceCache = null // { at, signedIn, wallets, bonusWallets }
  const BALANCE_TTL = 5000

  async function readBalance(force) {
    const now = Date.now()
    if (!force && balanceCache && now - balanceCache.at < BALANCE_TTL) return balanceCache
    const account = accountService()
    if (!account) return { at: now, signedIn: false, wallets: [], bonusWallets: [], unavailable: 'no-account-service' }
    try {
      const state = await account.getState()
      const signedIn = Boolean(state && state.status === 'credential-stored')
      if (!signedIn) return { at: now, signedIn: false, wallets: [], bonusWallets: [], usageUrl: state?.links?.usageUrl }
      const result = await account.getBalance(clientMeta())
      if (result && result.status === 'ready') {
        balanceCache = {
          at: now,
          signedIn: true,
          wallets: result.value || [],
          bonusWallets: result.bonusWallets || [],
          usageUrl: state?.links?.usageUrl,
        }
      } else if (!balanceCache) {
        return { at: now, signedIn: true, wallets: [], bonusWallets: [], failed: true, usageUrl: state?.links?.usageUrl }
      }
      return balanceCache
    } catch (error) {
      if (balanceCache) return balanceCache // 抖动沿用上次成功值
      return { at: now, signedIn: false, wallets: [], bonusWallets: [], failed: String(error?.message || error) }
    }
  }

  async function summaryHandler(req, res) {
    try {
      const now = Date.now()
      const url = new URL(req.url || '/', 'http://127.0.0.1')
      const force = url.searchParams.get('force') === '1'
      const balance = await readBalance(force)
      const wallets = Array.isArray(balance.wallets) ? balance.wallets : []
      const cny = wallets.find((w) => String(w.currency).toUpperCase() === 'CNY')
      const any = cny || wallets[0] || null
      const amount = any && Number.isFinite(Number(any.balance)) ? Number(any.balance) : null
      if (balance.signedIn && amount !== null) observe(beijingDay(now), now, amount)
      sendJson(res, 200, {
        ok: true,
        version: VERSION,
        signedIn: Boolean(balance.signedIn),
        wallet: any ? { currency: String(any.currency).toUpperCase(), balance: String(any.balance) } : null,
        bonus: (balance.bonusWallets || []).map((w) => ({ currency: String(w.currency).toUpperCase(), balance: String(w.balance) })),
        failed: Boolean(balance.failed),
        unavailable: balance.unavailable || null,
        today: todaySummary(now),
        peak: { isPeak: isPeak(now), nextChangeAt: nextPeakChangeAt(now), now },
        settings: loadSettings(),
        currentModel: currentModelInfo(),
        usageUrl: balance.usageUrl || null,
        updatedAt: now,
      })
    } catch (error) {
      sendJson(res, 500, { ok: false, error: String(error?.message || error) })
    }
  }

  async function settingsHandler(req, res) {
    try {
      const method = String(req.method || 'GET').toUpperCase()
      if (method === 'POST' || method === 'PUT') {
        const body = await readJsonBody(req)
        if (!body) return sendJson(res, 400, { ok: false, error: 'invalid-body' })
        const saved = saveSettings(body)
        return sendJson(res, 200, { ok: true, settings: saved })
      }
      sendJson(res, 200, { ok: true, settings: loadSettings(), defaults: DEFAULT_SETTINGS, items: KNOWN_ITEMS })
    } catch (error) {
      sendJson(res, 500, { ok: false, error: String(error?.message || error) })
    }
  }

  /** 轻量状态：设置 + 当前模型 + 峰谷（不含余额，不触发平台请求，客户端可 1s 轮询）。 */
  function stateHandler(req, res) {
    try {
      const now = Date.now()
      sendJson(res, 200, {
        ok: true,
        settings: loadSettings(),
        currentModel: currentModelInfo(),
        peak: { isPeak: isPeak(now), nextChangeAt: nextPeakChangeAt(now), now },
      })
    } catch (error) {
      sendJson(res, 500, { ok: false, error: String(error?.message || error) })
    }
  }

  function turnHandler(req, res) {
    try {
      const url = new URL(req.url || '/', 'http://127.0.0.1')
      const sessionId = url.searchParams.get('sessionId') || ''
      const messageId = url.searchParams.get('messageId') || ''
      if (!sessionId || !messageId) return sendJson(res, 400, { ok: false, reason: 'missing-params' })
      const sessions = (() => { try { return ctx.get('sessions') } catch { return undefined } })()
      const session = sessions && typeof sessions.get === 'function' ? sessions.get(sessionId) : undefined
      if (!session) return sendJson(res, 200, { ok: false, reason: 'no-session' })

      let found = null
      for (const event of session.snapshotEvents()) {
        if (event.type !== 'assistant/message') continue
        const message = event.data && event.data.message
        if (!message || String(message.id) !== String(messageId)) continue
        found = { event, message }
      }
      if (!found) return sendJson(res, 200, { ok: false, reason: 'no-message' })
      const usage = found.event.data.usage || null
      const model = (found.message.source && found.message.source.model) || null
      const at = Number(found.event.time) || Date.now()
      const cost = costOf(usage, model, at)
      sendJson(res, 200, {
        ok: true,
        messageId: String(messageId),
        model,
        at,
        isPeak: isPeak(at),
        usage: usage ? {
          inputTokens: Number(usage.inputTokens) || 0,
          outputTokens: Number(usage.outputTokens) || 0,
          cacheReadTokens: Number(usage.cacheReadTokens) || 0,
          cacheWriteTokens: Number(usage.cacheWriteTokens) || 0,
          reasoningTokens: Number(usage.reasoningTokens) || 0,
        } : null,
        cost,
      })
    } catch (error) {
      sendJson(res, 500, { ok: false, error: String(error?.message || error) })
    }
  }

  try {
    // webServer 可能晚于本插件发布：必须走 ctx.inject，不能 apply 时直接 get。
    ctx.inject(['webServer'], (scoped) => {
      const server = scoped.webServer
      scoped.effect(
        () => server.register({ kind: 'exact', path: '/api/dsh-better-hud/summary', handler: summaryHandler }),
        `${PLUGIN}: summary route`,
      )
      scoped.effect(
        () => server.register({ kind: 'exact', path: '/api/dsh-better-hud/turn', handler: turnHandler }),
        `${PLUGIN}: turn route`,
      )
      scoped.effect(
        () => server.register({ kind: 'exact', path: '/api/dsh-better-hud/settings', handler: settingsHandler }),
        `${PLUGIN}: settings route`,
      )
      scoped.effect(
        () => server.register({ kind: 'exact', path: '/api/dsh-better-hud/state', handler: stateHandler }),
        `${PLUGIN}: state route`,
      )
      logger?.info?.(`${PLUGIN}: API mounted at /api/dsh-better-hud`)
    })
  } catch (error) {
    logger?.warn?.(`${PLUGIN}: host half failed to mount: ${error?.message || error}`)
  }
}

export default { apply }
