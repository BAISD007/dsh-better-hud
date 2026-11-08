window.__ModuleLoader__.load({
  id: 'dsh-better-hud',
  factory(require) {
    const React = require('react')
    const h = React.createElement

    const NAME = 'dsh-better-hud'
    const API = '/api/dsh-better-hud'
    const STYLE_ID = NAME + '/styles'
    /** 官方充值页（与账号平台 links.topUpUrl 一致：new URL('/top_up', 'https://platform.deepseek.com')）。 */
    const RECHARGE_URL = 'https://platform.deepseek.com/top_up'

    /* ── 样式（注入一次，卸载时移除）───────────────────────────── */
    const CSS = `
.uwh-topbar {
  position: fixed; top: 0; left: 0; right: 0;
  height: var(--dsh-frame-top-clearance, 48px);
  display: flex; align-items: center; justify-content: center;
  gap: 18px; padding: 0 16px;
  pointer-events: none; z-index: 40;
  font: inherit; font-size: 13px; line-height: 1;
  color: var(--dsw-alias-label-secondary);
  white-space: nowrap; overflow: hidden;
  font-variant-numeric: tabular-nums;
}
.uwh-topbar[hidden] { display: none; }
.uwh-item { display: inline-flex; align-items: baseline; gap: 2px; }
.uwh-value { color: inherit; }
.uwh-peak { color: var(--dsw-alias-state-warn-primary); }
.uwh-offpeak { color: var(--dsw-alias-state-success-primary); }
.uwh-cost { display: inline-flex; align-items: center; gap: 2px; font-size: 12px; color: var(--dsw-alias-label-secondary); opacity: .8; font-variant-numeric: tabular-nums; white-space: nowrap; }
.uwh-cost-value { color: inherit; }
.uwh-set { display: flex; flex-direction: column; gap: 16px; max-width: 760px; }
.uwh-set-card { border: 1px solid var(--dsw-alias-border-l1); border-radius: 12px; background: var(--dsw-alias-bg-layer-1); padding: 2px 16px; }
.uwh-set-row { display: flex; align-items: center; justify-content: space-between; gap: 16px; padding: 12px 0; }
.uwh-set-row + .uwh-set-row { border-top: 1px solid var(--dsw-alias-border-l1); }
.uwh-set-row.is-dim { opacity: .55; }
.uwh-set-main { min-width: 0; }
.uwh-set-title { font-size: 14px; line-height: 20px; color: var(--dsw-alias-label-primary); }
.uwh-set-desc { margin-top: 2px; font-size: 12px; line-height: 18px; color: var(--dsw-alias-label-secondary); }
.uwh-set-group-title { padding: 12px 0 0; font-size: 12px; line-height: 18px; color: var(--dsw-alias-label-secondary); }
.uwh-set-hint { margin: 0; padding: 6px 0 10px; font-size: 12px; line-height: 18px; color: var(--dsw-alias-label-secondary); }
.uwh-set-error { margin: 0; font-size: 12px; color: var(--dsw-alias-state-error-primary); }
.uwh-set-ok { margin: 0; font-size: 12px; color: var(--dsw-alias-state-success-primary); }
.uwh-switch { position: relative; flex: none; width: 36px; height: 20px; padding: 0; border: none; border-radius: 999px; background: var(--dsw-alias-border-l2); cursor: pointer; transition: background .15s ease; }
.uwh-switch:focus-visible { outline: 2px solid var(--dsw-alias-brand-primary); outline-offset: 2px; }
.uwh-switch.is-on { background: var(--dsw-alias-brand-primary); }
.uwh-switch.is-disabled { cursor: not-allowed; opacity: .6; }
.uwh-switch-knob { position: absolute; top: 2px; left: 2px; width: 16px; height: 16px; border-radius: 50%; background: #fff; box-shadow: 0 1px 2px rgba(0,0,0,.25); transition: transform .15s ease; }
.uwh-switch.is-on .uwh-switch-knob { transform: translateX(16px); }

/* 余额低于预警线：只把「DeepSeek余额」这一段变红，其它两段保持原色。 */
.uwh-item.is-low { color: var(--dsw-alias-state-error-primary, #e5484d); pointer-events: auto; text-decoration: none; }
.uwh-item.is-low:hover { text-decoration: underline; }
.uwh-item.is-low .uwh-value { color: inherit; }
.uwh-item.is-low:focus-visible { outline: 2px solid var(--dsw-alias-brand-primary); outline-offset: 2px; border-radius: 4px; }
a.uwh-item { text-decoration: none; }

/* 设置页数字输入 */
.uwh-set-num-row { display: flex; align-items: center; gap: 6px; flex: none; }
.uwh-set-num { box-sizing: border-box; width: 96px; padding: 4px 8px; border: 1px solid var(--dsw-alias-border-l2); border-radius: 8px; background: var(--dsw-alias-bg-base); color: var(--dsw-alias-label-primary); font: inherit; font-size: 13px; text-align: right; }
.uwh-set-num:disabled { opacity: .55; cursor: not-allowed; }
.uwh-set-unit { font-size: 13px; color: var(--dsw-alias-label-secondary); }

/* 充值页：桌面端内嵌原生 Platform 视图（window.dshPlatform.open('top-up')），
   这里只画 48px 返回栏和承载视图的容器，样式对齐官方账号页。 */
.uwh-recharge { position: fixed; inset: 0; z-index: 1001; display: flex; flex-direction: column; background: var(--dsw-alias-bg-base); pointer-events: auto; }
[data-windows-titlebar] .uwh-recharge { padding-top: var(--dsh-windows-titlebar-height); }
.uwh-recharge-head { box-sizing: border-box; flex: none; height: 48px; padding: 6px 16px; border-bottom: .5px solid var(--dsw-alias-border-l1); -webkit-app-region: initial; }
.uwh-recharge-back { display: inline-flex; align-items: center; gap: 8px; height: 28px; padding: 0 6px; border: none; border-radius: var(--dsw-radius-sm, 6px); background: transparent; color: var(--dsw-alias-label-secondary); font: inherit; font-size: 14px; line-height: 22px; white-space: nowrap; cursor: pointer; }
.uwh-recharge-back:hover { color: var(--dsw-alias-label-primary); }
.uwh-recharge-back:focus-visible { outline: 2px solid var(--dsw-alias-brand-primary); outline-offset: 2px; }
.uwh-recharge-body { position: relative; flex: 1; min-height: 0; }
.uwh-recharge-status { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 16px; color: var(--dsw-alias-label-tertiary); font-size: 14px; line-height: 22px; text-align: center; }
.uwh-recharge-btn { box-sizing: border-box; height: 32px; padding: 0 12px; border: 1px solid var(--dsw-alias-border-l2); border-radius: 8px; background: transparent; color: var(--dsw-alias-label-primary); font: inherit; font-size: 13px; cursor: pointer; }
.uwh-recharge-btn:hover { border-color: var(--dsw-alias-brand-primary); }

/* 会话切换动效（移植自 dsh-client-ui-custom 的 motion，MIT）
   只跑在宿主自己的锚点上：消息行 / 对话列；只在整段加载时播。 */
@keyframes uwh-motion-rise { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
@keyframes uwh-motion-fade-in { from { opacity: 0; } to { opacity: 1; } }
@keyframes uwh-motion-panel-in { from { opacity: .4; transform: translateY(6px); } to { opacity: 1; transform: none; } }
.uwh-motion-fade-up {
  animation: uwh-motion-rise 280ms cubic-bezier(.33, 1, .68, 1) both;
  animation-delay: var(--uwh-motion-delay, 0ms);
}
.uwh-motion-panel { animation: uwh-motion-panel-in 300ms cubic-bezier(.33, 1, .68, 1) both; }
@media (prefers-reduced-motion: reduce) {
  .uwh-motion-fade-up, .uwh-motion-panel {
    animation-name: uwh-motion-fade-in;
    animation-duration: 100ms;
    animation-delay: 0ms;
  }
}

/* 侧边栏悬停卡弹出动效：淡入 + 轻微缩放回正 + 上浮（只作用于 hoverContent 那张卡） */
@keyframes uwh-pop-in {
  from { opacity: 0; translate: 0 8px; scale: .955; }
  to { opacity: 1; translate: 0 0; scale: 1; }
}
.uwh-pop { animation: uwh-pop-in 210ms cubic-bezier(.16, 1, .3, 1) both; }
@media (prefers-reduced-motion: reduce) {
  .uwh-pop { animation-name: uwh-motion-fade-in; animation-duration: 100ms; }
}
`

    /* ── 小工具 ─────────────────────────────────────────────────── */
    const fmtMoney = (value, digits) => {
      const n = Number(value)
      if (!Number.isFinite(n)) return '—'
      return n.toFixed(digits === undefined ? 2 : digits)
    }
    const currencySymbol = (code) => (code === 'USD' ? '$' : '¥')

    function fmtDuration(ms) {
      const total = Math.max(0, Math.floor(ms / 1000))
      const hours = Math.floor(total / 3600)
      const minutes = Math.floor((total % 3600) / 60)
      const seconds = total % 60
      const pad = (n) => String(n).padStart(2, '0')
      return pad(hours) + ':' + pad(minutes) + ':' + pad(seconds)
    }

    async function getJson(path) {
      const response = await fetch(API + path, {
        method: 'GET',
        credentials: 'same-origin',
        headers: { accept: 'application/json' },
        cache: 'no-store',
      })
      if (!response.ok) throw new Error('http-' + response.status)
      return response.json()
    }

    async function postJson(path, body) {
      const response = await fetch(API + path, {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'content-type': 'application/json', accept: 'application/json' },
        body: JSON.stringify(body),
        cache: 'no-store',
      })
      if (!response.ok) throw new Error('http-' + response.status)
      return response.json()
    }

    function useMedia(query) {
      const [matches, setMatches] = React.useState(() => {
        try { return window.matchMedia(query).matches } catch (err) { return false }
      })
      React.useEffect(() => {
        let mql
        try { mql = window.matchMedia(query) } catch (err) { return undefined }
        const onChange = () => setMatches(mql.matches)
        try { mql.addEventListener('change', onChange) } catch (err) { mql.addListener(onChange) }
        setMatches(mql.matches)
        return () => {
          try { mql.removeEventListener('change', onChange) } catch (err) { mql.removeListener(onChange) }
        }
      }, [query])
      return matches
    }

    /* ── 顶部栏 ─────────────────────────────────────────────────── */

    /**
     * 读取标题栏「应用 / 编辑」菜单的 computed style 与几何位置：
     * 顶栏照抄字体，并把左边缘锚到「编辑」右边缘 + 两个菜单项之间的间距。
     * 菜单是宿主自己的窗口 chrome（不是别的插件 DOM），读它是为了和标题栏完全一致；
     * 读不到（macOS 原生菜单栏等）时退回居中和主题 token。
     */
    /**
     * 读取标题栏「应用 / 编辑」字形的 computed style，让顶栏字体/字号/字色与标题栏一致。
     * 只读取宿主自己的窗口 chrome；读不到（macOS 原生菜单栏等）时退回主题 token。
     * 顶栏本身保持居中（不做左锚定）。
     */
    function measureCaptionStyle() {
      try {
        const matches = new Map() // 标签文字 -> 候选元素
        const seen = new Set()

        const consider = (el) => {
          if (!el || seen.has(el)) return
          seen.add(el)
          const text = (el.textContent || '').trim()
          if (text !== '应用' && text !== '编辑') return
          const rect = el.getBoundingClientRect()
          if (!rect) return
          // 只认标题栏里的小标签：贴顶、宽度合理、在窗口左半区、可见。
          if (rect.width < 8 || rect.width > 140) return
          if (rect.top < 0 || rect.top > 56 || rect.bottom > 64) return
          if (rect.left < 0 || rect.left > window.innerWidth * 0.5) return
          const cs = getComputedStyle(el)
          if (cs.visibility === 'hidden' || cs.display === 'none' || cs.opacity === '0') return
          const list = matches.get(text) || []
          list.push(el)
          matches.set(text, list)
        }

        for (let x = 20; x <= 320; x += 12) {
          let stack = []
          try { stack = document.elementsFromPoint(x, 26) } catch (err) { stack = [] }
          for (const el of stack) {
            consider(el)
            let up = el
            for (let i = 0; i < 3 && up; i += 1) {
              up = up.parentElement
              consider(up)
            }
          }
        }
        if (!matches.has('应用') || !matches.has('编辑')) {
          for (const el of document.querySelectorAll('body *')) {
            if (el.children.length > 0) continue
            consider(el)
          }
        }

        // 同一个标签可能同时命中「被拉宽的按钮」和「紧包字形的 span」，取最窄的（字形盒）。
        const pick = (label) => {
          const list = (matches.get(label) || [])
            .map((el) => ({ el, rect: el.getBoundingClientRect() }))
            .sort((a, b) => (a.rect.width - b.rect.width) || (a.rect.height - b.rect.height))
          return list[0] || null
        }
        const target = pick('编辑') || pick('应用')
        if (!target) return null

        const cs = getComputedStyle(target.el)
        return {
          color: cs.color,
          fontFamily: cs.fontFamily,
          fontSize: cs.fontSize,
          fontWeight: cs.fontWeight,
          letterSpacing: cs.letterSpacing,
        }
      } catch (err) {
        return null
      }
    }

    function useCaptionStyle() {
      const [style, setStyle] = React.useState(null)
      React.useEffect(() => {
        let alive = true
        const measure = () => {
          if (!alive) return
          const next = measureCaptionStyle()
          if (next) setStyle(next)
        }
        measure()
        // 字体加载、首帧布局、locale 切换后补测几次。
        const timers = [300, 1200, 3000].map((ms) => setTimeout(measure, ms))
        window.addEventListener('resize', measure)
        let observer = null
        try {
          observer = new ResizeObserver(measure)
          observer.observe(document.documentElement)
        } catch (err) {
          observer = null
        }
        return () => {
          alive = false
          for (const timer of timers) clearTimeout(timer)
          window.removeEventListener('resize', measure)
          if (observer) observer.disconnect()
        }
      }, [])
      return style
    }

    /** 顶栏刷新请求：每取到一轮真实消耗就触发一次（去抖），余额因此能及时跟上。 */
    const hudRefreshListeners = new Set()
    let hudRefreshTimer = null
    function requestHudRefresh() {
      if (hudRefreshTimer) return
      hudRefreshTimer = setTimeout(() => {
        hudRefreshTimer = null
        for (const listener of hudRefreshListeners) {
          try { listener() } catch (err) { /* ignore */ }
        }
      }, 1200)
    }

    /** 设置共享：顶栏、每轮消耗、设置页读同一份，保存后即时生效。 */
    const DEFAULT_SETTINGS_STATE = { version: 1, enabled: true, items: ['balance', 'today', 'peak'], turnCost: true, hideBalanceForNonOfficial: true, switchMotion: true, hoverMotion: true, warnBelow: 5 }
    let hudSettings = null
    const hudSettingsListeners = new Set()

    function applyHudSettings(next) {
      if (!next || typeof next !== 'object') return
      hudSettings = next
      for (const listener of hudSettingsListeners) {
        try { listener(next) } catch (err) { /* ignore */ }
      }
    }

    /**
     * 桌面端内嵌充值页：走 preload 暴露的 window.dshPlatform（open / setBounds / close），
     * 与官方账号设置页「去充值」用同一条原生 Platform 视图通道。Web 部署没有这个桥，
     * 调用方会退化成 window.open 新标签。
     */
    function rechargeBridge() {
      try {
        const bridge = window.dshPlatform
        if (bridge && typeof bridge.open === 'function' && typeof bridge.setBounds === 'function' && typeof bridge.close === 'function') return bridge
      } catch (err) { /* ignore */ }
      return null
    }

    function portalToBody(node) {
      try {
        const reactDom = require('react-dom')
        if (reactDom && typeof reactDom.createPortal === 'function') return reactDom.createPortal(node, document.body)
      } catch (err) { /* fall back to inline rendering */ }
      return node
    }

    function RechargeOverlay({ onClose }) {
      const backRef = React.useRef(null)
      const bodyRef = React.useRef(null)
      const [attempt, setAttempt] = React.useState(0)
      const [status, setStatus] = React.useState('loading')
      const bridge = rechargeBridge()

      React.useLayoutEffect(() => {
        const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null
        try { if (backRef.current) backRef.current.focus() } catch (err) { /* ignore */ }
        return () => {
          try { if (previous && previous.isConnected) previous.focus() } catch (err) { /* ignore */ }
        }
      }, [])

      React.useEffect(() => {
        if (!bridge || !bodyRef.current) return undefined
        const element = bodyRef.current
        let closed = false
        const bounds = () => {
          const rect = element.getBoundingClientRect()
          return { x: rect.x, y: rect.y, width: rect.width, height: rect.height }
        }
        const fail = () => { if (!closed) setStatus('failed') }
        setStatus('loading')
        Promise.resolve(bridge.open('top-up', bounds())).then(() => { if (!closed) setStatus('loaded') }, fail)
        let observer = null
        try {
          observer = new ResizeObserver(() => {
            try { Promise.resolve(bridge.setBounds(bounds())).catch(fail) } catch (err) { fail() }
          })
          observer.observe(element)
        } catch (err) { /* 没有 ResizeObserver 时窗口缩放不跟随，仍可用 */ }
        return () => {
          closed = true
          try { if (observer) observer.disconnect() } catch (err) { /* ignore */ }
          try { Promise.resolve(bridge.close()).catch(() => {}) } catch (err) { /* ignore */ }
        }
      }, [bridge, attempt])

      const openExternally = () => {
        try { window.open(RECHARGE_URL, '_blank', 'noopener,noreferrer') } catch (err) { /* ignore */ }
        onClose()
      }

      const statusNode = status === 'loaded' ? null : h('div', { className: 'uwh-recharge-status' },
        status === 'failed'
          ? h(React.Fragment, null,
              h('span', null, '充值页加载失败'),
              h('button', { type: 'button', className: 'uwh-recharge-btn', onClick: () => setAttempt((value) => value + 1) }, '重试'),
              h('button', { type: 'button', className: 'uwh-recharge-btn', onClick: openExternally }, '在浏览器打开'),
            )
          : h('span', null, '正在打开充值页…'),
      )

      return portalToBody(h('div', { className: 'uwh-recharge', role: 'dialog', 'aria-modal': 'true', 'aria-label': '充值' },
        h('header', { className: 'uwh-recharge-head', 'data-window-drag': true },
          h('button', { ref: backRef, type: 'button', className: 'uwh-recharge-back', onClick: onClose },
            h('span', { 'aria-hidden': 'true' }, '‹'),
            h('span', null, '返回 DeepSeek Harness'),
          ),
        ),
        h('div', { ref: bodyRef, className: 'uwh-recharge-body' }, statusNode),
      ))
    }

    function TopBar() {
      const compact = useMedia('(max-width: 1023px)')
      const tiny = useMedia('(max-width: 479px)')
      const captionStyle = useCaptionStyle()
      const [summary, setSummary] = React.useState(null)
      const [failure, setFailure] = React.useState(false)
      const [now, setNow] = React.useState(() => Date.now())
      const [sharedSettings, setSharedSettings] = React.useState(hudSettings)
      const [liveModel, setLiveModel] = React.useState(undefined)
      const [rechargeOpen, setRechargeOpen] = React.useState(false)
      const rootRef = React.useRef(null)

      const load = React.useCallback(async (force) => {
        try {
          const next = await getJson('/summary' + (force ? '?force=1' : ''))
          setSummary(next)
          setFailure(false)
          if (next && next.settings) applyHudSettings(next.settings)
        } catch (err) {
          setFailure(true)
        }
      }, [])

      React.useEffect(() => {
        let alive = true
        const poll = () => { if (alive) load(false) }
        const refreshNow = () => { if (alive) load(true) }
        poll()
        // 轮询只做兜底；真正的“余额变了”靠每轮消耗回填后主动刷新。
        const timer = setInterval(poll, 30000)
        const onVisible = () => { if (document.visibilityState === 'visible') refreshNow() }
        document.addEventListener('visibilitychange', onVisible)
        window.addEventListener('focus', refreshNow)
        hudRefreshListeners.add(refreshNow)
        return () => {
          alive = false
          clearInterval(timer)
          document.removeEventListener('visibilitychange', onVisible)
          window.removeEventListener('focus', refreshNow)
          hudRefreshListeners.delete(refreshNow)
        }
      }, [load])

      React.useEffect(() => {
        hudSettingsListeners.add(setSharedSettings)
        return () => { hudSettingsListeners.delete(setSharedSettings) }
      }, [])

      // 轻量 1s 轮询：设置与当前模型都从 /state 拿（不触发平台余额请求），切换模型/改设置即时生效。
      React.useEffect(() => {
        let alive = true
        let lastKey = null
        const poll = async () => {
          try {
            const state = await getJson('/state')
            if (!alive || !state || state.ok !== true) return
            if (state.settings) applyHudSettings(state.settings)
            const model = state.currentModel || null
            const key = model
              ? String(model.provider) + '/' + String(model.model) + '/' + String(model.official)
              : 'none'
            if (key !== lastKey) {
              setLiveModel(model)
              // 模型真的变了：立刻刷一次余额（切回官方时余额要马上可用）。
              if (lastKey !== null) load(true)
              lastKey = key
            }
          } catch (err) { /* ignore */ }
        }
        poll()
        const timer = setInterval(poll, 1000)
        return () => { alive = false; clearInterval(timer) }
      }, [load])

      // 秒级倒计时：直接读本机时钟（同一台机器，不需要服务端校准）。
      React.useEffect(() => {
        const nextChangeAt = summary && summary.peak && summary.peak.nextChangeAt
        if (!nextChangeAt) return undefined
        const timer = setInterval(() => {
          const current = Date.now()
          setNow(current)
          // 到边界主动拉一次，避免标签滞后。
          if (current >= nextChangeAt) load(true)
        }, 1000)
        return () => clearInterval(timer)
      }, [summary, load])

      // 一次性诊断日志（不再在界面上画探针）。
      React.useEffect(() => {
        try {
          const clearance = getComputedStyle(document.documentElement).getPropertyValue('--dsh-frame-top-clearance').trim()
          const rect = rootRef.current && rootRef.current.getBoundingClientRect()
          console.log('[' + NAME + '] topbar: --dsh-frame-top-clearance=' + (clearance || '(none)') + ' rect=' + (rect ? rect.top + '..' + rect.bottom : 'none'))
        } catch (err) { /* ignore */ }
      }, [])

      const wallet = summary && summary.wallet ? summary.wallet : null
      const today = summary && summary.today ? summary.today : null
      const peak = summary && summary.peak ? summary.peak : null
      const symbol = wallet ? currencySymbol(wallet.currency) : '¥'

      const settings = sharedSettings || (summary && summary.settings) || DEFAULT_SETTINGS_STATE
      const items = settings.enabled === false ? [] : (Array.isArray(settings.items) ? settings.items : [])
      const currentModel = liveModel !== undefined ? liveModel : ((summary && summary.currentModel) || null)
      // 只有明确 official === false 才判定为非官方；刚启动还没有模型事件时按官方处理，避免误藏。
      const nonOfficial = Boolean(currentModel && currentModel.official === false)
      const hideAll = nonOfficial && settings.hideBalanceForNonOfficial !== false
      const showBalance = items.includes('balance')
      const showToday = items.includes('today')
      const showPeak = items.includes('peak')

      // 非官方模型 + 开关打开：顶部整条不显示；还没拿到数据或全关时同样不画。
      if (summary === null && liveModel === undefined) return null
      if (hideAll) return null
      if (!showBalance && !showToday && !showPeak) return null

      const remaining = peak && peak.nextChangeAt ? peak.nextChangeAt - now : 0
      const countdown = peak && peak.nextChangeAt ? fmtDuration(remaining) : null
      const peakLabel = peak && peak.isPeak ? '高峰时段' : '错峰优惠'
      const peakClass = peak && peak.isPeak ? 'uwh-peak' : 'uwh-offpeak'

      const balanceText = wallet ? symbol + ' ' + fmtMoney(wallet.balance) : '—'
      const todayText = today ? symbol + ' ' + fmtMoney(today.amount) : '—'

      // 余额预警：低于阈值时只把余额这一段变红，并可点击打开充值页。
      const rawWarnBelow = Number(settings.warnBelow)
      const warnBelow = Number.isFinite(rawWarnBelow) ? rawWarnBelow : 5
      const lowBalance = Boolean(wallet) && warnBelow > 0
        && Number(wallet.balance) < warnBelow
      const rechargeHint = lowBalance
        ? '余额低于 ' + symbol + ' ' + fmtMoney(warnBelow) + '，点击充值'
        : null
      const openRecharge = (event) => {
        if (!lowBalance) return
        if (!rechargeBridge()) return // 没有桌面桥：让 <a target="_blank"> 自己去开浏览器
        try {
          event.preventDefault()
          event.stopPropagation()
        } catch (err) { /* ignore */ }
        setRechargeOpen(true)
      }
      const balanceClass = 'uwh-item' + (lowBalance ? ' is-low' : '')
      const balanceAnchorProps = lowBalance
        ? { href: RECHARGE_URL, target: '_blank', rel: 'noopener noreferrer', title: rechargeHint, onClick: openRecharge }
        : null
      const renderBalance = (key, ...inner) => (lowBalance
        ? h('a', { key, className: balanceClass, ...balanceAnchorProps }, ...inner)
        : h('span', { key, className: balanceClass }, ...inner))

      const children = []
      if (tiny) {
        if (showBalance) children.push(renderBalance('b', balanceText))
        else if (showToday) children.push(h('span', { key: 't', className: 'uwh-item' }, todayText))
        if (showPeak && countdown) {
          children.push(h('span', { key: 'p', className: 'uwh-item ' + peakClass }, countdown.slice(0, 5)))
        }
      } else if (compact) {
        if (showBalance || showToday) {
          children.push(h('span', { key: 'bt', className: 'uwh-item' },
            showBalance
              ? (lowBalance
                  ? h('a', { className: balanceClass, ...balanceAnchorProps }, balanceText)
                  : balanceText)
              : null,
            showToday ? (showBalance ? '/' : '') + fmtMoney(today ? today.amount : null) : null,
          ))
        }
        if (showPeak && countdown) {
          children.push(h('span', { key: 'p', className: 'uwh-item ' + peakClass }, countdown))
        }
      } else {
        if (showBalance) {
          children.push(renderBalance('b',
            h('span', null, 'DeepSeek余额：'),
            h('span', { className: 'uwh-value' }, balanceText),
          ))
        }
        if (showToday) {
          children.push(h('span', { key: 't', className: 'uwh-item' },
            h('span', null, '今日已用：'),
            h('span', { className: 'uwh-value' }, todayText),
          ))
        }
        if (showPeak && countdown) {
          children.push(h('span', { key: 'p', className: 'uwh-item ' + peakClass },
            h('span', null, peakLabel + ' '),
            h('span', { className: 'uwh-value' }, countdown),
            h('span', null, ' 后结束'),
          ))
        }
      }

      const titleParts = []
      if (showBalance && wallet) titleParts.push('DeepSeek余额 ' + symbol + fmtMoney(wallet.balance))
      if (lowBalance) titleParts.push(rechargeHint)
      if (showToday && today) titleParts.push('今日已用 ' + fmtMoney(today.amount) + (today.partialDay ? '（部分观测）' : ''))
      if (showPeak && countdown) titleParts.push((peak.isPeak ? '高峰时段' : '错峰优惠') + ' ' + countdown + ' 后结束')
      if (failure) titleParts.push('（数据暂不可用）')

      return h(React.Fragment, null,
        h('div', {
          ref: rootRef,
        className: 'uwh-topbar',
        'data-uwh': 'topbar',
        'aria-label': titleParts.join('，') || '用量信息',
        title: titleParts.join(' · '),
        style: captionStyle
          ? {
              color: captionStyle.color,
              fontFamily: captionStyle.fontFamily,
              fontSize: captionStyle.fontSize,
              fontWeight: captionStyle.fontWeight,
              letterSpacing: captionStyle.letterSpacing,
            }
          : undefined,
      }, children),
        rechargeOpen ? h(RechargeOverlay, { onClose: () => setRechargeOpen(false) }) : null,
      )
    }

    /* ── 每轮消耗 ───────────────────────────────────────────────── */
    const turnCache = new Map()
    const turnPending = new Map()

    function loadTurnCost(sessionId, messageId) {
      const key = String(sessionId) + '/' + String(messageId)
      if (turnCache.has(key)) return Promise.resolve(turnCache.get(key))
      if (turnPending.has(key)) return turnPending.get(key)
      const path = '/turn?sessionId=' + encodeURIComponent(String(sessionId)) + '&messageId=' + encodeURIComponent(String(messageId))
      const promise = getJson(path)
        .then((value) => { turnCache.set(key, value); return value })
        .catch(() => null)
        .finally(() => { turnPending.delete(key) })
      turnPending.set(key, promise)
      return promise
    }

    function TurnCost(props) {
      const sessionId = props && props.sessionId
      const messageId = props && props.messageId
      const [state, setState] = React.useState(null)
      const [hudSet, setHudSet] = React.useState(hudSettings || DEFAULT_SETTINGS_STATE)

      React.useEffect(() => {
        hudSettingsListeners.add(setHudSet)
        if (!hudSettings) {
          getJson('/settings')
            .then((value) => { if (value && value.settings) applyHudSettings(value.settings) })
            .catch(() => { /* 老的宿主没有设置路由时保持默认 */ })
        }
        return () => { hudSettingsListeners.delete(setHudSet) }
      }, [])

      React.useEffect(() => {
        let alive = true
        if (!sessionId || !messageId) return undefined
        loadTurnCost(sessionId, messageId).then((value) => {
          if (!alive) return
          setState(value)
          // 本轮消耗一落地，说明余额刚被扣过，立刻让顶栏拉一次最新余额。
          if (value && value.ok === true) requestHudRefresh()
        })
        return () => { alive = false }
      }, [sessionId, messageId])

      if (hudSet && hudSet.turnCost === false) return null
      if (!state || state.ok !== true) return null
      if (state.cost === null || state.cost === undefined) return null
      const cost = Number(state.cost)
      const text = cost > 0 && cost < 0.0001 ? '< ¥0.0001' : '¥ ' + fmtMoney(cost, 4)
      const detail = state.usage
        ? '用量 ' + (state.usage.inputTokens + state.usage.cacheReadTokens + state.usage.outputTokens) + ' tok · ' + (state.isPeak ? '高峰价' : '谷价')
        : ''
      return h('span', {
        className: 'uwh-cost',
        'data-uwh': 'turn-cost',
        title: detail,
      },
        h('span', null, '本轮消耗：'),
        h('span', { className: 'uwh-cost-value' }, text),
      )
    }

    /* ── 设置页 ─────────────────────────────────────────────────── */
    const HUD_SETTINGS_FALLBACK = { version: 1, enabled: true, items: ['balance', 'today', 'peak'], turnCost: true, hideBalanceForNonOfficial: true, switchMotion: true, hoverMotion: true, warnBelow: 5 }
    const HUD_ITEMS = [
      { id: 'balance', title: '余额', desc: 'DeepSeek 账户实时余额' },
      { id: 'today', title: '今日已用', desc: '按余额观测累计的今日消费' },
      { id: 'peak', title: '峰谷倒计时', desc: '距离高峰 / 错峰切换的剩余时间' },
    ]

    function Toggle(props) {
      const on = props.on === true
      return h('button', {
        type: 'button',
        role: 'switch',
        'aria-checked': on ? 'true' : 'false',
        'aria-label': props.label || '',
        disabled: props.disabled ? true : undefined,
        className: 'uwh-switch' + (on ? ' is-on' : '') + (props.disabled ? ' is-disabled' : ''),
        onClick: () => { if (!props.disabled) props.onChange(!on) },
      }, h('span', { className: 'uwh-switch-knob' }))
    }

    function SettingsPage() {
      const [settings, setSettings] = React.useState(null)
      const [error, setError] = React.useState('')
      const [saved, setSaved] = React.useState(false)

      React.useEffect(() => {
        let alive = true
        getJson('/settings')
          .then((value) => {
            if (!alive) return
            const next = value && value.settings ? value.settings : HUD_SETTINGS_FALLBACK
            setSettings(next)
            applyHudSettings(next)
          })
          .catch(() => {
            if (!alive) return
            setSettings(HUD_SETTINGS_FALLBACK)
            setError('读取设置失败，先按默认值显示')
          })
        return () => { alive = false }
      }, [])

      React.useEffect(() => {
        if (!saved) return undefined
        const timer = setTimeout(() => setSaved(false), 2000)
        return () => clearTimeout(timer)
      }, [saved])

      const commit = React.useCallback((next) => {
        setSettings(next)
        applyHudSettings(next)
        setError('')
        setSaved(false)
        postJson('/settings', next)
          .then((value) => {
            if (value && value.settings) {
              setSettings(value.settings)
              applyHudSettings(value.settings)
            }
            setSaved(true)
            requestHudRefresh()
          })
          .catch(() => setError('保存失败，请重试'))
      }, [])

      if (!settings) {
        return h('div', { className: 'uwh-set' }, h('p', { className: 'uwh-set-hint' }, '正在读取设置…'))
      }

      const enabled = settings.enabled !== false
      const items = Array.isArray(settings.items) ? settings.items : []
      const toggleItem = (id) => {
        const next = items.includes(id) ? items.filter((item) => item !== id) : [...items, id]
        commit({ ...settings, items: next })
      }

      return h('div', { className: 'uwh-set' },
        h('div', { className: 'uwh-set-card' },
          h('div', { className: 'uwh-set-row' },
            h('div', { className: 'uwh-set-main' },
              h('div', { className: 'uwh-set-title' }, '在标题栏显示用量信息'),
            ),
            h(Toggle, {
              on: enabled,
              label: '在标题栏显示用量信息',
              onChange: (on) => commit({ ...settings, enabled: on }),
            }),
          ),
        ),
        h('div', { className: 'uwh-set-card' },
          h('div', { className: 'uwh-set-group-title' }, '显示内容'),
          HUD_ITEMS.map((item) => h('div', {
            key: item.id,
            className: 'uwh-set-row' + (enabled ? '' : ' is-dim'),
          },
            h('div', { className: 'uwh-set-main' },
              h('div', { className: 'uwh-set-title' }, item.title),
              h('div', { className: 'uwh-set-desc' }, item.desc),
            ),
            h(Toggle, {
              on: items.includes(item.id),
              disabled: !enabled,
              label: item.title,
              onChange: () => toggleItem(item.id),
            }),
          )),
        ),
        h('div', { className: 'uwh-set-card' },
          h('div', { className: 'uwh-set-row' + (enabled ? '' : ' is-dim') },
            h('div', { className: 'uwh-set-main' },
              h('div', { className: 'uwh-set-title' }, '余额预警'),
              h('div', { className: 'uwh-set-desc' }, '余额低于该金额时，标题栏余额变红；点击余额可直接打开充值页（填 0 关闭）'),
            ),
            h('div', { className: 'uwh-set-num-row' },
              h('input', {
                className: 'uwh-set-num',
                type: 'number',
                min: 0,
                max: 1000000,
                step: 0.5,
                inputMode: 'decimal',
                disabled: !enabled,
                'aria-label': '余额预警金额（元）',
                value: String(typeof settings.warnBelow === 'number' ? settings.warnBelow : 5),
                onChange: (event) => {
                  const raw = Number(event.target.value)
                  const value = Number.isFinite(raw) ? Math.max(0, Math.min(1000000, Math.round(raw * 100) / 100)) : 0
                  if (value === settings.warnBelow) return
                  commit({ ...settings, warnBelow: value })
                },
              }),
              h('span', { className: 'uwh-set-unit' }, '元'),
            ),
          ),
        ),
        h('div', { className: 'uwh-set-card' },
          h('div', { className: 'uwh-set-row' },
            h('div', { className: 'uwh-set-main' },
              h('div', { className: 'uwh-set-title' }, '显示每轮消耗'),
              h('div', { className: 'uwh-set-desc' }, '在每条助手消息的动作行里显示「本轮消耗 ¥x.xxxx」'),
            ),
            h(Toggle, {
              on: settings.turnCost !== false,
              label: '显示每轮消耗',
              onChange: (on) => commit({ ...settings, turnCost: on }),
            }),
          ),
        ),
        h('div', { className: 'uwh-set-card' },
          h('div', { className: 'uwh-set-row' },
            h('div', { className: 'uwh-set-main' },
              h('div', { className: 'uwh-set-title' }, '会话切换动效'),
              h('div', { className: 'uwh-set-desc' }, '切换会话时，对话整体淡入、消息逐行错开出现'),
            ),
            h(Toggle, {
              on: settings.switchMotion !== false,
              label: '会话切换动效',
              onChange: (on) => commit({ ...settings, switchMotion: on }),
            }),
          ),
        ),
        h('div', { className: 'uwh-set-card' },
          h('div', { className: 'uwh-set-row' },
            h('div', { className: 'uwh-set-main' },
              h('div', { className: 'uwh-set-title' }, '会话悬停卡动效'),
              h('div', { className: 'uwh-set-desc' }, '鼠标停在侧边栏会话上时，弹出的卡片淡入并轻微缩放'),
            ),
            h(Toggle, {
              on: settings.hoverMotion !== false,
              label: '会话悬停卡动效',
              onChange: (on) => commit({ ...settings, hoverMotion: on }),
            }),
          ),
        ),
        h('div', { className: 'uwh-set-card' },
          h('div', { className: 'uwh-set-row' },
            h('div', { className: 'uwh-set-main' },
              h('div', { className: 'uwh-set-title' }, '当调用非 DeepSeek 官方模型时，不显示余额'),
            ),
            h(Toggle, {
              on: settings.hideBalanceForNonOfficial !== false,
              label: '当调用非 DeepSeek 官方模型时，不显示余额',
              onChange: (on) => commit({ ...settings, hideBalanceForNonOfficial: on }),
            }),
          ),
        ),
        error ? h('p', { className: 'uwh-set-error' }, error) : null,
        saved ? h('p', { className: 'uwh-set-ok' }, '已保存') : null,
      )
    }

    /* ── 会话切换动效（只保留这一处）────────────────────────────────
     * 思路与实现移植自 dsh-client-ui-custom（MIT）的 motion 模块：靠宿主自己的
     * 锚点工作，不猜 class、不改官方结构。
     *   [data-chat-anchor-key]  每条消息行
     *   [data-chat-flow]        对话列
     * 只在「整段加载」时播（切会话 / 首次打开 / 恢复上次会话）：
     * 对话列轻微上浮一次，消息行逐行错峰 40ms（上限 320ms）。
     * 流式新增的消息、思考卡、工具卡、输入区一律不动，保持默认。
     * 关掉：localStorage['dsh-better-hud:motion'] = 'off'，刷新即可。
     */
    const MOTION_OFF_KEY = 'dsh-better-hud:motion'
    const MOTION_ROW = '[data-chat-anchor-key]'
    const MOTION_FLOW = '[data-chat-flow]'
    const MOTION_ROW_MARK = 'uwh-motion-row'
    const MOTION_ROW_CLASS = 'uwh-motion-fade-up'
    const MOTION_PANEL_CLASS = 'uwh-motion-panel'
    const MOTION_STAGGER_STEP_MS = 40
    const MOTION_STAGGER_CAP_MS = 320
    const MOTION_RETRY_MS = 80
    const MOTION_MAX_RETRIES = 12

    function installChatMotion() {
      if (!document.body) return () => {}
      try {
        if (window.localStorage && window.localStorage.getItem(MOTION_OFF_KEY) === 'off') return () => {}
      } catch (err) { /* 读不到就按开启处理 */ }

      const marked = new Set()
      const lastCount = new Map()
      let disposed = false
      let switchTimer = 0
      let switchAttempts = 0

      const clearMarked = () => {
        for (const row of marked) {
          row.classList.remove(MOTION_ROW_MARK, MOTION_ROW_CLASS)
          row.style.removeProperty('--uwh-motion-delay')
        }
        marked.clear()
      }

      const isRow = (node) => node instanceof HTMLElement && node.matches(MOTION_ROW)
      const isTopRow = (row) => row.parentElement === null || row.parentElement.closest(MOTION_ROW) === null
      // 隐藏行 / 高度为 0 的占位行不参与动画，也别占用错峰序号。
      const visibleRow = (row) => row.getClientRects().length > 0 && row.offsetHeight > 0

      // 设置页的开关：关掉就不再播，并立刻清掉已经挂上去的类和变量。
      let offCleaned = false
      const motionOn = () => !(hudSettings && hudSettings.switchMotion === false)
      const resetVisuals = () => {
        clearMarked()
        for (const el of document.querySelectorAll('.' + MOTION_PANEL_CLASS)) el.classList.remove(MOTION_PANEL_CLASS)
      }
      const onSettings = (next) => {
        if (!next || next.switchMotion !== false) return
        resetVisuals()
        offCleaned = true
      }
      hudSettingsListeners.add(onSettings)
      // 首屏先把设置取回来，免得「已经关掉了还先播一次」。
      if (!hudSettings) {
        getJson('/settings')
          .then((value) => { if (value && value.settings) applyHudSettings(value.settings) })
          .catch(() => { /* 老宿主没有设置路由时按默认开启 */ })
      }

      // 只给整段加载的行加入场：逐条新增（流式）完全不动。
      const applyBatch = (rows) => {
        // 切过的会话把旧行丢进 marked 了，顺手清掉，别一直攒着。
        for (const row of marked) if (!row.isConnected) marked.delete(row)
        const ordered = [...rows].sort((a, b) => (
          a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1
        ))
        ordered.forEach((row, index) => {
          const delay = Math.min(index * MOTION_STAGGER_STEP_MS, MOTION_STAGGER_CAP_MS)
          row.style.setProperty('--uwh-motion-delay', delay + 'ms')
          // 宿主可能复用同一个行元素（切会话）：先摘掉再强制回流，动画才会重播。
          if (row.classList.contains(MOTION_ROW_MARK)) {
            row.classList.remove(MOTION_ROW_MARK, MOTION_ROW_CLASS)
            void row.offsetWidth
          }
          row.classList.add(MOTION_ROW_MARK, MOTION_ROW_CLASS)
          marked.add(row)
        })
      }

      const classEntrance = (el, cls) => {
        el.classList.remove(cls)
        void el.offsetWidth
        el.classList.add(cls)
      }

      const playPanel = () => {
        const flow = document.querySelector(MOTION_FLOW)
        if (flow) classEntrance(flow, MOTION_PANEL_CLASS)
      }

      // 换会话兜底：等宿主 commit 完新行再扫一遍，拿不到就重试几次。
      const replayRows = () => {
        if (disposed || !motionOn()) return
        const rows = [...document.querySelectorAll(MOTION_ROW)].filter(isTopRow).filter(visibleRow)
        const flow = document.querySelector(MOTION_FLOW)
        if (rows.length === 0 && flow === null && switchAttempts < MOTION_MAX_RETRIES) {
          switchAttempts += 1
          switchTimer = window.setTimeout(replayRows, MOTION_RETRY_MS)
          return
        }
        if (rows.length > 0) applyBatch(rows)
        if (flow) classEntrance(flow, MOTION_PANEL_CLASS)
      }

      const observer = new MutationObserver((mutations) => {
        if (disposed) return
        if (!motionOn()) {
          if (!offCleaned) { resetVisuals(); offCleaned = true }
          return
        }
        offCleaned = false
        const byParent = new Map()
        const removedParents = new Set()
        let flowTouched = false

        for (const mutation of mutations) {
          if (mutation.type !== 'childList') continue
          for (const node of mutation.addedNodes) {
            if (!(node instanceof HTMLElement)) continue
            if (node.matches(MOTION_FLOW) || node.querySelector(MOTION_FLOW) !== null) flowTouched = true
            const rows = []
            if (isRow(node)) rows.push(node)
            else rows.push(...node.querySelectorAll(MOTION_ROW))
            for (const row of rows) {
              if (!isTopRow(row) || !visibleRow(row)) continue
              const parent = row.parentElement
              if (parent === null) continue
              const list = byParent.get(parent) || []
              list.push(row)
              byParent.set(parent, list)
            }
          }
          for (const node of mutation.removedNodes) {
            if (!(node instanceof HTMLElement)) continue
            if (node.matches(MOTION_ROW) || node.querySelector(MOTION_ROW) !== null) {
              const parent = node.matches(MOTION_ROW) ? mutation.target : node
              if (parent instanceof Element) removedParents.add(parent)
            }
          }
        }

        // 行分批：同一父容器里「之前是空的」或「这一批伴随移除」= 整段加载。
        const batches = []
        for (const [parent, rows] of byParent) {
          const wasEmpty = (lastCount.get(parent) || 0) === 0
          batches.push({ parent, rows, load: removedParents.has(parent) || wasEmpty })
        }
        for (const parent of byParent.keys()) {
          lastCount.set(parent, parent.querySelectorAll(MOTION_ROW).length)
        }
        // 只有整段加载才播；流式新增直接跳过。
        for (const batch of batches) {
          if (batch.load) applyBatch(batch.rows)
        }

        // 整段换掉（切会话）：对话列整体重进一次。
        let switched = false
        for (const parent of removedParents) {
          if (parent.querySelectorAll(MOTION_ROW).length === 0) switched = true
        }
        if (flowTouched || switched) {
          window.clearTimeout(switchTimer)
          switchAttempts = 0
          // 这一批已经把新行按错峰播过了，就只补对话列的进场，别再让行重播一遍。
          if (byParent.size > 0) playPanel()
          else switchTimer = window.setTimeout(replayRows, 60)
        }
      })

      observer.observe(document.body, { childList: true, subtree: true })

      return () => {
        disposed = true
        observer.disconnect()
        window.clearTimeout(switchTimer)
        hudSettingsListeners.delete(onSettings)
        clearMarked()
        for (const el of document.querySelectorAll('.' + MOTION_PANEL_CLASS)) {
          el.classList.remove(MOTION_PANEL_CLASS)
        }
      }
    }

    /* ── 侧边栏悬停卡弹出动效 ─────────────────────────────────────
     * 只认工作区 / 会话行的悬停卡：它内部有宿主自己的 CSS-module 局部名
     * `*_hoverContent`（[class*="hoverContent"]），往上最近的定位祖先就是那张卡。
     * 其它浮层（下拉、菜单、模型选择器）一律不动 —— 它们大多自带透明度 / 背景模糊
     * 过渡，再叠一层动画就会闪。
     * 每次显形只播一次；隐藏后标记复位，下次再悬停还有动画。
     * 关掉：localStorage['dsh-better-hud:motion'] = 'off'，刷新即可。
     */
    const POP_CLASS = 'uwh-pop'
    const HOVER_CARD_CONTENT = '[class*="hoverContent"]'
    const HOVER_ROW = '[class*="sessionRow"], [class*="projectRow"]'

    function installHoverCardPop() {
      if (!document.body) return () => {}
      let killed = false
      try { killed = Boolean(window.localStorage) && window.localStorage.getItem(MOTION_OFF_KEY) === 'off' } catch (err) { killed = false }
      if (killed) return () => {}

      const animated = new WeakMap()
      const watch = []
      let frame = 0
      let stopped = false
      let lastTrigger = 0

      // 设置页开关：关掉就不再播，并把已经挂上的动画立刻撤掉。
      let offCleaned = false
      const hoverOn = () => !(hudSettings && hudSettings.hoverMotion === false)
      const resetVisuals = () => {
        for (const card of watch) {
          animated.delete(card)
          try { card.classList.remove(POP_CLASS) } catch (err) { /* ignore */ }
        }
        watch.length = 0
        for (const el of document.querySelectorAll('.' + POP_CLASS)) el.classList.remove(POP_CLASS)
      }
      const onSettings = (next) => {
        if (!next || next.hoverMotion !== false) return
        resetVisuals()
        offCleaned = true
      }
      hudSettingsListeners.add(onSettings)
      // 首屏先把设置取回来，免得「已经关掉了还先播一次」。
      if (!hudSettings) {
        getJson('/settings')
          .then((value) => { if (value && value.settings) applyHudSettings(value.settings) })
          .catch(() => { /* 老宿主没有设置路由时按默认开启 */ })
      }

      // 从 hoverContent 往上找那张卡：优先定位祖先，其次 role=tooltip。
      const cardOf = (content) => {
        let el = content
        for (let depth = 0; depth < 5 && el; depth += 1) {
          let cs = null
          try { cs = getComputedStyle(el) } catch (err) { cs = null }
          if (!cs) return null
          if (cs.position === 'fixed' || cs.position === 'absolute') return el
          if (el.getAttribute && el.getAttribute('role') === 'tooltip') return el
          el = el.parentElement
        }
        return null
      }

      const play = (card) => {
        if (stopped || !hoverOn()) return
        if (!card || !card.classList || !card.isConnected) return
        if (card.classList.contains(POP_CLASS)) return
        // 同一个卡片元素只播一次：它一直挂着就说明还停在这次悬停上，别再重播。
        if (animated.has(card)) return
        let cs = null
        try { cs = getComputedStyle(card) } catch (err) { cs = null }
        if (!cs) return
        if (cs.display === 'none' || cs.visibility === 'hidden' || Number(cs.opacity) < 0.02) return
        if (card.getClientRects().length === 0) return
        // 宿主自己已经在动这张卡的话不插手。
        if (cs.animationName && cs.animationName !== 'none') return
        animated.set(card, Date.now())
        watch.push(card)
        card.classList.add(POP_CLASS)
      }

      const scan = () => {
        frame = 0
        if (stopped) return
        if (!hoverOn()) {
          if (!offCleaned) { resetVisuals(); offCleaned = true }
          return
        }
        offCleaned = false
        const seen = new Set()
        let contents = []
        try { contents = document.querySelectorAll(HOVER_CARD_CONTENT) } catch (err) { contents = [] }
        for (const content of contents) {
          const card = cardOf(content)
          if (!card || seen.has(card)) continue
          seen.add(card)
          play(card)
        }
      }

      const schedule = () => {
        if (stopped || frame) return
        frame = window.requestAnimationFrame(scan)
      }

      // 悬停后卡片可能过一小会儿才出来：鼠标从外面进到侧边栏行时才排扫描；
      // 在同一行内部移动（标题文字、图标之间）不算新的悬停，直接忽略。
      const onPointer = (event) => {
        const target = event.target
        if (!(target instanceof Element)) return
        const row = target.closest(HOVER_ROW)
        if (row === null) return
        const from = event.relatedTarget
        if (from instanceof Node && row.contains(from)) return
        const now = Date.now()
        if (now - lastTrigger < 200) return
        lastTrigger = now
        schedule()
        window.setTimeout(schedule, 80)
        window.setTimeout(schedule, 220)
        window.setTimeout(schedule, 420)
      }
      document.addEventListener('pointerover', onPointer, true)

      // 卡片是插进 DOM 的话，这一次就够快。
      let observer = null
      try {
        observer = new MutationObserver((records) => {
          if (stopped) return
          for (const record of records) {
            if (record.type !== 'childList') continue
            for (const node of record.addedNodes) {
              if (!(node instanceof HTMLElement)) continue
              if (node.matches(HOVER_CARD_CONTENT) || node.querySelector(HOVER_CARD_CONTENT) !== null) {
                schedule()
                return
              }
            }
          }
        })
        observer.observe(document.body, { childList: true, subtree: true })
      } catch (err) { observer = null }

      // 已播过的卡片：等它真的隐藏后把标记复位，下次再悬停还能播。
      // 只看 display / visibility / opacity —— 布局上一瞬间没 rect 不算隐藏。
      const sweepTimer = setInterval(() => {
        if (stopped) return
        for (let i = watch.length - 1; i >= 0; i -= 1) {
          const card = watch[i]
          if (!card.isConnected) { watch.splice(i, 1); continue }
          let cs = null
          try { cs = getComputedStyle(card) } catch (err) { cs = null }
          if (!cs) continue
          const hidden = cs.display === 'none' || cs.visibility === 'hidden' || Number(cs.opacity) < 0.02
          if (hidden) { animated.delete(card); watch.splice(i, 1) }
        }
      }, 200)

      const onAnimationEnd = (event) => {
        const el = event.target
        if (el && el.classList && el.classList.contains(POP_CLASS)) el.classList.remove(POP_CLASS)
      }
      document.addEventListener('animationend', onAnimationEnd, true)
      document.addEventListener('animationcancel', onAnimationEnd, true)

      return () => {
        stopped = true
        if (observer) observer.disconnect()
        clearInterval(sweepTimer)
        if (frame) window.cancelAnimationFrame(frame)
        hudSettingsListeners.delete(onSettings)
        document.removeEventListener('pointerover', onPointer, true)
        document.removeEventListener('animationend', onAnimationEnd, true)
        document.removeEventListener('animationcancel', onAnimationEnd, true)
        for (const el of document.querySelectorAll('.' + POP_CLASS)) el.classList.remove(POP_CLASS)
      }
    }

    /* ── 插件 ───────────────────────────────────────────────────── */
    function insertStyles() {
      try {
        const existing = document.getElementById(STYLE_ID)
        if (existing) existing.remove()
        const style = document.createElement('style')
        style.id = STYLE_ID
        style.textContent = CSS
        document.head.appendChild(style)
        return () => {
          try { style.remove() } catch (err) { /* ignore */ }
        }
      } catch (err) {
        return () => {}
      }
    }

    function resolveSlots(ctx) {
      try {
        if (ctx && ctx.slots && typeof ctx.slots.register === 'function') return ctx.slots
      } catch (err) { /* continue */ }
      try {
        if (ctx && typeof ctx.get === 'function') {
          const viaGet = ctx.get('slots')
          if (viaGet && typeof viaGet.register === 'function') return viaGet
        }
      } catch (err) { /* continue */ }
      return null
    }

    function register(slots, slotName, id, order, Component) {
      const dispose = slots.inject(slotName, () => slots.register({ name: slotName, id, order }, Component))
      return dispose
    }

    return {
      inject: ['slots'],
      apply(ctx) {
        const disposers = []
        disposers.push(insertStyles())
        try {
          disposers.push(installChatMotion())
          console.log('[' + NAME + '] chat motion installed')
        } catch (err) {
          console.error('[' + NAME + '] failed to install chat motion', err)
        }
        try {
          disposers.push(installHoverCardPop())
          console.log('[' + NAME + '] hover-card motion installed')
        } catch (err) {
          console.error('[' + NAME + '] failed to install hover-card motion', err)
        }
        const slots = resolveSlots(ctx)
        if (!slots) {
          console.warn('[' + NAME + '] slots service not found; UI will not render')
          return () => { for (const d of disposers) { try { d && d() } catch (err) { /* ignore */ } } }
        }
        try {
          disposers.push(register(slots, 'shell.overlay', NAME + '.topbar', -100, TopBar))
          console.log('[' + NAME + '] registered shell.overlay topbar')
        } catch (err) {
          console.error('[' + NAME + '] failed to register topbar', err)
        }
        try {
          disposers.push(register(slots, 'conversation.chat.assistant-actions', NAME + '.turn-cost', 100, TurnCost))
          console.log('[' + NAME + '] registered assistant-actions turn-cost')
        } catch (err) {
          console.error('[' + NAME + '] failed to register turn-cost', err)
        }
        try {
          disposers.push(slots.inject('settings.section', () => slots.register({
            name: 'settings.section',
            id: NAME + '.settings',
            order: 45,
            label: '用量与余额 HUD',
          }, SettingsPage)))
          console.log('[' + NAME + '] registered settings.section')
        } catch (err) {
          console.error('[' + NAME + '] failed to register settings section', err)
        }
        return () => {
          for (const dispose of disposers) {
            try { if (typeof dispose === 'function') dispose() } catch (err) { /* ignore */ }
          }
        }
      },
      defaults: {},
    }
  },
})
