# dsh-better-hud 实现路线

> 状态：设计稿 v1（2026-10-20）。只完成了调研与方案，**未写代码、未安装、未改动 profile**。
> 依据：`效果图.png` / `image.png` / `Frame 2.png`（宽屏、标注变化点、652px 窄窗），以及本机已装的 `dsh-whale-widget@0.4.2`（记账内核与定价口径的参照物）。

---

## 0. 一句话

一个标准 DSH bundle：**Host 半身负责取数、记账、算价，Client 半身只负责在两个「加法座位」上渲染**——
顶部一条常驻用量栏（`shell.overlay`）+ 每轮一行「本轮消耗」（优先 `conversation.chat.assistant-actions`）。
不顶替任何官方 UI，不注入 DOM，不重复官方已有的 token 信息。

---

## 1. 目标与验收口径

### 1.1 三个画面

| 场景 | 形态 |
|---|---|
| 宽屏（≥1024） | `DeepSeek余额：¥26.25　今日已用：¥3.14　高峰时段 02:29:03 后结束`；「高峰时段」与倒计时用告警红 |
| 窄屏（<1024，652px 实测） | `¥26.25/3.14　02:29:03`；无标签，仅数字 + 红色倒计时 |
| 每轮行 | 官方已有 `用量 3.3M tok`（detailed 模式默认显示）+ 官方时间 `10月15日 13:01`；**插件只补中间那截** `本轮消耗：¥0.1007` |

### 1.2 非目标（明确不做）

- 不替换 `conversation.chat.node` 的 `assistant-step`（等于重写整段助手渲染，官方升级即崩）。
- 不重复 `conversation.composer.dock` 已有的 `activity` / `usage` 两个统计控件。
- 不做 iframe、不 `document.body.appendChild`、不学 whale 的页面脚本注入方式（见 §5.1）。
- v1 不接平台账单接口（没有公开的用量 API；平台只给了 `usageUrl` 链接）。

### 1.3 验收

- 1920 / 1280 / 1024 / 652 / 480 五档宽度截图正确（1024 卡在断点两侧各一张）。
- 亮/暗主题、zh/en 两种 locale 下文案与颜色正确。
- 未登录、网络失败、未知模型、跨零点四种降级都有明确显示（见 §4）。
- 卸载插件后 interval / listener / style / 槽位条目全部消失。

---

## 2. 三个结论（先记住这三条）

1. **顶部栏只能放 `shell.overlay`**（root 级、覆盖整帧、默认 click-through 的加法座位），不能改侧栏或标题栏本体。
2. **每轮那行不能"插入"官方行内部**——`conversation.chat.turnTail` 是独立块（动作行之前），插进去就等于另起一行；只有替换官方节点才能同排，而替换被禁止。所以优先 `assistant-actions`（进动作行），不行就退 `turnTail`（紧邻一行，只写 ¥）。
3. **今日已用不是"每轮成本累加"，而是"余额观测账本"**——照抄 `dsh-whale-widget/lib/accounting.mjs` 的语义：余额下降=消费、上升=充值单列、观测缺口=部分数据。

---

## 3. 座位（Slot）与约束

| 用途 | Seat | 类型/作用域 | 关键事实 |
|---|---|---|---|
| 顶部栏 | `shell.overlay` | root / list | 覆盖整帧、位于所有列之上、**层本身 click-through，条目自行 opt-in pointer events**；`id` 必须用自己的（复用官方 id = 替换该条目）。官方目录里还有 `account.platform-page`、`shell.quota-notice` 等占用者，互不冲突。 |
| 每轮成本（首选） | `conversation.chat.assistant-actions` | session / list | 「某条已定稿助手消息的动作」，owner props 只有 `{ messageId: MessageId }`；官方 occupant 是 `feedback`（order 10）。官方说明：**没有任何条目时，标准动作行保持原样**；有条目则追加。 |
| 每轮成本（退路） | `conversation.chat.turnTail` | session / list | 「完成轮次动作行之前的扩展贡献」，owner props `{ turn: TurnLocation, seq, openFile }`；是**动作行之前的独立块**，不是官方行内部。 |
| 数据传送 | Host 路由 + 投影 | — | 见 §5。 |

### 3.1 为什么"同一行"要选 assistant-actions

红框那行实际由三段拼成：

```
[官方] 用量 3.3M tok   [插件新增] 本轮消耗：¥0.1007   [官方] 10月15日 13:01
```

- `3.3M tok` 和那个时间是 ui-chat 在 detailed 模式下**自带的**默认显示，插件不该再画一遍。
- `turnTail` 只能整体插在动作行之前 → 若把 token 也写上，同一回合出现两行 `3.3M tok`、两个时间。
- `assistant-actions` 的条目直接进**动作图标那一行**，最接近效果图；代价是条目可能被按"动作按钮"渲染，纯文本小胶囊需要 M0 探针确认。

### 3.2 待探针（M0 必须回答）

1. `shell.overlay` 的条目能否真正绘制进 Windows caption strip（48px 预留带，`--dsh-frame-top-clearance`），会不会破坏标题栏拖动（`-webkit-app-region` / `data-window-drag`）。
2. `assistant-actions` 里放纯文本条目会被渲染成什么？与官方 `3.3M tok` 是否同排？条目顺序相对官方文本可否控制？
3. `turnTail` / `assistant-actions` 里能否通过标准 props（`useChat` / `useTrajectory` / `useProjection`）拿到该消息的 usage；拿不到就走 §4.3 的投影方案。

---

## 4. 数据层

### 4.1 余额

- 服务：`ctx.deepseekAccount`
  - `getBalance(client: { version, locale, timezoneOffsetSeconds })`
    → `{ status: 'ready', value: AccountWallet[], bonusWallets: AccountWallet[] } | { status: 'failed' }`
  - `AccountWallet = { currency: 'CNY' | 'USD', balance: string }`
  - `getState()` → `{ status: 'signed-out' | 'credential-stored', links: { usageUrl, topUpUrl }, attempt }`
- 规则：
  - 未登录 / `credential-stored` 但取不到 → 顶部栏隐藏余额段（或显示 `—`），**不伪造 0**（与官方账号页一致）。
  - 失败沿用上次成功值 + 标记"数据较旧"（network jitter 不闪 `—`）。
  - 刷新：60s 定时 + 每轮 `turn/end` + `visibilitychange` 回前台 + 手动点击。
  - 点击 → `links.usageUrl`（外链）；若桌面端有内嵌平台页机制，后期再接，v1 直接外链。
  - 多币种：优先 CNY 钱包；USD 钱包只在前者缺失时显示（并带 `$`）。
  - `version` 用插件自身版本或宿主版本，`locale` 取 `ctx.locale`，`timezoneOffsetSeconds` 取当前时区偏移。
- 备选（v2）：`DEEPSEEK_API_KEY` 直连平台余额接口优先（whale 的做法），账号态兜底。v1 不引入。

### 4.2 今日已用（余额观测账本）

**为什么不用"每轮成本累加"**：那只统计 DSH 自己的调用，漏掉同账号的其它客户端；且价格表/峰谷/充值都会让数字对不上平台账单。whale 已验证的做法是盯余额：

- 观测点：每 60s 一次 `getBalance`，外加每轮结束、窗口回前台。
- 北京时间自然日（`beijingDay`）：`new Date(t + 8h).toISOString().slice(0,10)`。
- 当天首条观测 → `openingUnits`；之后每次观测：
  - 余额**下降** → `debitUnits += lastUnits - units`（消费）
  - 余额**上升** → `creditUnits += units - lastUnits`（充值/赠金，**不冲消费**）
  - 更新 `lastUnits` / `lastAt`
- 金额一律**定点整数**（scale = 1e8），避免浮点累计误差；显示时再除回。
- 「今日已用」= `opening - last - credits`（存在校正时用校正值），即**已观测消费**。
- 检测到 `creditUnits > 0` → 标「待核对余额调整」，提供"按累计到账金额校正"的能力（v1 可只标记 + 文档说明，不做 UI）。
- **部分数据判定**：起点距 00:00 或（对已过去的日子）末次观测距次日 00:00 超过 **10 分钟** → `partialDay`，界面标"部分/已观测"，不要假装完整。
- 账本按 **账户 × 币种** 分本（`scope = 账户标识`，whale 用密钥哈希；我们可用账号 id / `账户\|币种`），换凭据不串账、旧本仍可查。
- 持久化：`ctx.storageDomain`（`defineDomain` + zod 表；写盘后才算成功，`domain/changed` 通知）。字段：
  `{ day, firstAt, lastAt, openingUnits, lastUnits, debitUnits, creditUnits, revision, correction }`
- 文案：`今日已用` 主文案保留（贴合效果图），悬停/详情标 `已观测消费` + `部分数据`；无观测日显示 `—`。

### 4.3 每轮用量与消耗

- 数据源（session log）：`assistant/message` 事件自带 `usage?: TokenUsage`：
  `{ inputTokens, outputTokens, totalTokens?, cacheReadTokens?, cacheWriteTokens?, reasoningTokens? }`，同时 `message.source = { kind:'model', provider, model }`，事件有 `time`。
- 推荐通道：**Host 投影**（`ctx.sessionProjections.register`）按消息/轮次聚合 usage 并**在 Host 侧算好金额**；practices 明确要求「客户端需要从 session 派生的值 → 用 wire view 推过去，客户端不要自己 fold 事件」。
  - `key`：`dshUsageHud.turnCost`
  - `state`：`{ byMessage: { [messageId]: { units, model, at, tokens } }, byTurn: { [turn]: { units } } }`
  - `wire.view`：同上（只暴露展示所需）
  - `stateVersion`：改语义时 +1
- 兜底 1：若客户端 `useProjection` 看不到第三方 key（类型/白名单限制），退到 client 侧从 `useChat`/`useTrajectory` 读 usage 现算（价格与峰谷函数抽成纯 JS 共享）。
- 兜底 2：再不行，Host 提供 `GET /api/dsh-better-hud/turn-costs?sessionId=…`，客户端按 messageId 查（多一次 RTT，可接受）。
- 计价公式（单个 attempt / 单条消息）：
  ```
  hit   = cacheReadTokens                × 单价[cacheHit]
  miss  = (inputTokens - cacheReadTokens) × 单价[cacheMiss]
  out   = outputTokens                   × 单价[output]
  cost  = (hit + miss + out) × (isPeak(event.time) ? 1 : 0.5) / 1e6
  ```
  一轮 = 该轮所有 step 的所有 assistant/message 之和。
- 边界：
  - 未知模型 → **只显示 token（其实官方行已有）或直接不显示 ¥**，不瞎估。
  - 无 usage（中断/失败轮）→ 整段不显示，与官方 usage 行同规则（官方也是"不完整就不展示"）。
  - 历史轮、翻页、压缩：投影 fold 的是完整 log，天然不受影响。
  - 时间戳（`10月15日 13:01`）由官方行负责；插件不画，避免重复。

### 4.4 峰谷与倒计时

口径直接复用 `dsh-whale-widget`（官方 2026-09-19 说明）：

- **高峰**：北京时间**周一至周五（不含中国法定节假日）9:00–12:00、14:00–18:00**。
- **谷价**：其余全部——周末、调休上班的周末、法定节假日全天；2026-08-23 起周末全天谷价。
- **谷价 = 高峰价 × 0.5**。
- 需要维护两份数据：`PEAK_HOURS = [[9,12],[14,18]]` 与 `HOLIDAY_VALLEY_LIST`（每年国务院公布次年安排后补一年）。
- 倒计时：`nextPeakChangeAt(now)` 逐分钟/逐秒扫描下一个 `isPeakTime` 翻转点；Host 返回 `{ inPeak, nextChangeAt }`（用 Host 时钟），Client 只做 1s 格式化与显示。标签两种：
  - 高峰中：`高峰时段 hh:mm:ss 后结束`
  - 谷时中：`错峰优惠 hh:mm:ss 后结束`（颜色换 `--dsw-alias-state-success-primary`；是否显示待拍板）

### 4.5 价格表（默认值与 whale 对齐）

单位：CNY / 百万 token，`[谷价, 峰价]`：

| 模型 | 缓存命中 | 缓存未命中 | 输出 |
|---|---|---|---|
| `deepseek-flash`（V4.1 Flash） | 0.02 / 0.04 | 1 / 2 | 4 / 8 |
| `deepseek-v4-pro` | 0.15 / 0.30 | 4.5 / 9 | 13.5 / 27 |

- 别名 `deepseek-v4-flash`、`deepseek-v4-flash-vision-exp` 按 Flash 计价。
- 全部进 Config（用户可在 patch 层覆盖）；官方调价只改配置，不改代码。
- 记账统一按 CNY；USD 单价需汇率（v1 不做，仅注释预留）。

---

## 5. 架构与包结构

```
dsh-better-hud/
  package.json          # type:module; exports . / ./client / ./locale/*.json / ./icon
                        # dsh.bundle.patch + dsh.client{platform:"web", inject:[...]}
  cordis.patch.yml      # insert 一行 + config（价格/峰谷/开关/对齐）
  index.js              # Host：余额缓存、turn 投影、观测账本、/api/dsh-better-hud 路由
  client.js             # Client：__ModuleLoader__ 静态模块，注册两个 seat
  locale/{zh,en}.json    # meta.title / meta.description（展示元数据必填）
  icon.svg              # 原创图标（≤256KiB，留在包内）
```

### 5.1 Host 半身

- `export const inject = ['deepseekAccount', 'sessionProjections', 'storageDomain']`（可选依赖用 `ctx.inject([...], ...)`，缺服务时插件不启用而不是抛错）。
- 三段职责：
  1. **余额服务**：60s 缓存 + 强制刷新；`getBalance` / `getState`；失败沿用旧值。
  2. **投影**：`sessionProjections.register({ key, stateSchema, init, apply, wire, stateVersion })`，fold `assistant/message`（usage + model + time）与轮次边界。
  3. **账本**：`defineDomain({ name:'dsh-better-hud', version:1, tables:{ days: domainTable(rowSchema) } })` + `storageDomain.open()`；由余额观测驱动（§4.2）。
- HTTP 路由（参照 `dsh-our-free-model` 的已验证写法）：
  ```js
  ctx.inject(['webServer'], (scoped) => {
    const server = scoped.webServer
    scoped.effect(() => server.register({ kind: 'exact', path: '/api/dsh-better-hud/summary', handler }), 'usage-hud: summary')
  })
  ```
  注意：**不要在 `apply()` 顶部直接读 `ctx.webServer`**（服务可能尚未就绪）。
- 不做客户端脚本注入（`tapIndex`）：那是 whale 的路线（无 `dsh.client`，宿主把 `assets/whale-widget.js` 注入页面自绘 DOM），与"使用官方槽位 + 主题 + 布局"的目标冲突。

### 5.2 Client 半身

- 模块形状（照 `dsh-effort-slider/lib/client.js` 的已验证写法）：
  ```js
  window.__ModuleLoader__.load({ id: 'dsh-better-hud', factory(require) {
    const React = require('react')
    return { apply(ctx) { /* 两次 slots.inject */ }, inject: ['slots', 'locale'] }
  }})
  ```
- 顶部栏组件：`ctx.slots.inject('shell.overlay', () => ctx.slots.register({ name:'shell.overlay', id:'usage-hud-topbar', order: -100 }, TopBar))`
- 每轮组件：优先 `assistant-actions`（`id:'usage-hud-turn-cost'`, `order` 在 `feedback` 之后），否则 `turnTail`。
- 样式：`ctx.effect` 插入 `<style>` 并在 disposer 移除；只用 `--dsw-alias-*` token；数字 `font-variant-numeric: tabular-nums`。
- 时间/轮询全部在 effect 里建立并清理；窄窗不 tick（`matchMedia` 控制）。

### 5.3 接口契约

`GET /api/dsh-better-hud/summary`

```json
{
  "signedIn": true,
  "wallets": [ { "currency": "CNY", "balance": "26.25" } ],
  "today": { "amount": 3.14, "currency": "CNY", "partialDay": false, "needsReview": false, "source": "balance-observed" },
  "peak": { "inPeak": true, "nextChangeAt": 1760000000000 },
  "usageUrl": "https://platform.deepseek.com/...",
  "updatedAt": 1760000000000
}
```

投影 wire view（每会话）：

```json
{ "byMessage": { "<messageId>": { "units": 100700000, "model": "deepseek-flash", "at": 1760000000000 } },
  "byTurn": { "7": { "units": 100700000 } } }
```

### 5.4 Config 草案

```yaml
- insert:
    - id: dsh-better-hud
      name: 'dsh-better-hud'
      config:
        topbar:
          enabled: true
          align: center          # center | left | right（相对标题栏可用区）
          offsetPx: 0
          refreshMs: 60000
        turnCost:
          enabled: true
          seat: actions          # actions | turnTail（探针后的最终选择）
          decimals: 4
        today:
          enabled: true
          label: observed        # observed | plain
        peak:
          hours: [[9, 12], [14, 18]]
          holidays: ['2026-01-01']   # 法定节假日全天谷价
        pricing:
          currency: CNY
          models:
            deepseek-flash:   { cacheHit: [0.02, 0.04], cacheMiss: [1, 2],     output: [4, 8] }
            deepseek-v4-pro:  { cacheHit: [0.15, 0.30], cacheMiss: [4.5, 9],   output: [13.5, 27] }
```

---

## 6. 视觉与响应式规范

### 6.1 三档宽度

| 断点 | 文案 | 说明 |
|---|---|---|
| ≥1024 | `DeepSeek余额：¥26.25　今日已用：¥3.14　高峰时段 02:29:03 后结束` | 完整；标签次要色，峰段告警红 |
| <1024（含 652） | `¥26.25/3.14　02:29:03` | 去标签、斜杠合并余额/今日、只保留一个 ¥；倒计时红 |
| <480（可选） | `¥26.25　02:29` | 只留余额；倒计时到分钟；或整条降到 11px 保留完整数字 |

断点取 **1024** 的原因：这是 frame 让侧栏自动收起的位置；侧栏一收，Windows 标题栏会多出「展开侧栏 / 新会话」两个 frame 图标，可用宽度骤减，压缩态必须从这一刻开始。

### 6.2 定位与命中

- `position: fixed; top: 0; height: var(--dsh-frame-top-clearance, 48px)`，横向按 `align` 在标题栏可用区内对齐，`max-width: calc(100vw - var(--hud-clearance, 360px))`，`white-space: nowrap; text-overflow: ellipsis`。
- 外层 `pointer-events: none`（保持标题栏可拖动）；只有"点击看明细/跳转"的分段 `pointer-events: auto`，并加 `-webkit-app-region: no-drag`。
- `z-index` 不硬编码，跟随 `shell.overlay` 层内顺序；**不要**覆盖 `shell.quota-notice` / 弹窗（overlay 层内已有优先级机制，按 order 排）。

### 6.3 颜色 / 无障碍

- 颜色只用 token：正文 `--dsw-alias-label-primary`、次要 `--dsw-alias-label-secondary`、峰段 `--dsw-alias-state-warn-primary`、谷段 `--dsw-alias-state-success-primary`。
- 窄态只剩数字：保留完整 `aria-label`（`DeepSeek 余额 26.25 元，今日已用 3.14 元，高峰时段还有 2 小时 29 分 3 秒`）+ `title` 悬停提示。
- 数字等宽（`tabular-nums`），避免每秒跳动导致整条抖动；金额固定两位小数，消耗固定四位（与效果图 `¥0.1007` 一致）。
- `prefers-reduced-motion`：不做滚动数字动画（whale 有滚动动画，我们 v1 不做）。

---

## 7. 分阶段路线

| 阶段 | 交付 | 验收 / 退出条件 | 失败退路 |
|---|---|---|---|
| **M0 探针**（半天） | 40 行插件：overlay 顶部画一条 2px 色条；同时注册 `assistant-actions` 与 `turnTail` 各一个纯文本条目；打印 `--dsh-frame-top-clearance`、元素 `getBoundingClientRect()`、标准 props keys | 截图确认：色条是否落在 Windows caption strip、是否挡拖动；文本条目在动作行里的渲染形态与顺序；能否拿到 usage | 顶部栏退到 `conversation.session.header.utilities`（右侧工具区）或 `shell.bottom`；每轮退到 `turnTail` |
| **M1 数据** | `/summary` 路由 + 投影 + 账本（内存版） | `curl` 校验余额/今日/峰谷；覆盖未登录、网络失败、未知模型、跨零点 | 账本先不落盘（v1.5 再补 storageDomain） |
| **M2 顶部栏** | 三档响应式 + 1s tick + 60s 刷新 + 点击跳转 | 五档宽度、亮暗、zh/en 截图；无指针遮挡；拖动正常 | 去掉点击能力，纯展示 |
| **M3 每轮行** | 成本条目（仅 ¥）+ 历史轮 + 无 usage 隐藏 | 与官方 `3.3M tok` 不重复；数字与权威 usage/价格可手算复核 | 退回 `turnTail` 极窄一行 |
| **M4 持久化与打磨** | `storageDomain` 落盘（zod）、partialDay、校正标记；清理/性能 | 重启后"今日已用"仍在；10 分钟缺口能标部分；卸载无残留 | 账本仅内存 + 明示"重启清零" |
| **M5 展示资源与安装** | locale meta、icon、README；`plugin_manager install_bundle` | `application: applied`；`Slots.listSubTree` 确认两个 seat 的 occupant；页面实测 | 回滚插件、保留文档 |

> 安装/启停会写 profile，属于需要用户确认的操作；本阶段只出文档。

---

## 8. 风险与未决项

| # | 风险 / 未决 | 影响 | 缓解 |
|---|---|---|---|
| 1 | Windows caption strip 由 desktop/frame 绘制，`shell.overlay` 的层级与拖动行为未实测 | 顶部栏可能无法落在标题栏、或挡住拖动 | M0 先验证；不行退到会话标题行右侧 |
| 2 | `assistant-actions` 条目按"动作按钮"渲染，纯文本可能不合法 | 无法与官方 usage 同排 | M0 验证；退 `turnTail` |
| 3 | 第三方投影 key 在客户端 `useProjection` 是否可见（类型/runtime 过滤）未验证 | 每轮成本拿不到 | 退 client 侧读 usage 自算，或 Host 提供 turn-costs 接口 |
| 4 | 今日已用依赖"界面开着且余额取得到"，且充值会把数字算歪 | 数字偏小/偏大 | 沿用 whale 的 partialDay + credit 单列 + "已观测消费"文案 + 校正入口（v2） |
| 5 | 法定节假日表需每年更新 | 节假日当天价格/倒计时错 | 配置项 + README 提醒；与 whale 同一份数据 |
| 6 | 价格表会随官方调价过期 | 金额系统性偏差 | 全量配置化；显式 `pricingVersion`，过期不猜 |
| 7 | 与 whale 同时装：两处都显示余额/今日/峰谷，口径可能不一致 | 用户困惑 | 默认值与算法对齐（§9）；文案区分"顶部栏/挂件"；后续可考虑共用一份配置 |
| 8 | 若复用 whale 的 `accounting.mjs` 代码 | 许可 | 保留 MIT 署名（`LICENSE`/`NOTICE`） |

---

## 9. 与 dsh-whale-widget 的口径对齐清单

1. 价格表默认值（§4.5）完全一致。
2. 峰谷时段（工作日 9–12、14–18；周末/节假日全天谷）与节假日表同源。
3. 余额取数优先级：v1 我们都用 `deepseekAccount`；若后续接 API key 路径，沿用"key 优先、账号兜底、赠金计入基线"。
4. 金额定点（1e8）、两位小数显示、"余额上升 = 充值单列"。
5. 今日已用文案：`已观测消费`（可附 `部分数据`），不写"精确账单"。
6. 每轮消耗计价规则：真实 usage × 事件时刻峰谷价，不按请求时刻或当前时刻。

---

## 10. 参考资料（本机可查）

**官方能力（`cordis_inspect_query`）**
- Slots：`shell.overlay`、`conversation.chat.assistant-actions`、`conversation.chat.turnTail`、`conversation.composer.dock`
- Service：`deepseekAccount`（`getBalance`/`getState`/`watch`）、`sessionProjections`、`storageDomain`、`webServer`、`sessions`、`llm`
- Event：`session/event`、`assistant/message`（含 `usage`）、`turn/end`、`deepseek-account/*`
- 主题 token：`--dsw-alias-label-*`、`--dsw-alias-state-*`、`--dsw-alias-bg-*`、`--dsw-alias-border-*`
- 框架变量：`--dsh-frame-top-clearance`、`--dsh-frame-overlay-top`、`--dsh-frame-chrome-top`、`--dsh-frame-leading-clearance`

**本机已有实现（可参考 / 抄）**
- `dsh-whale-widget`（profile 内）：`lib/accounting.mjs` 记账内核、`lib/index.js` 价格表与峰谷函数、README「定价表」「记账与显示」「每轮对话消耗」章节
- `dsh-effort-slider/lib/client.js`：静态 client 模块形状、`slots.inject + register` 的已验证写法
- `dsh-our-free-model/index.js`：`webServer.register` 路由 + `ctx.inject(['webServer'], …)` 的就绪处理
- `@deepseek-ai/dsh-session-stats`：投影单元写法参考（`sessionStats`）
- `@deepseek-ai/dsh-client-ui-chat` README「Turn token usage」「Completed-turn footer」：官方每轮 usage 行的行为与展示条件

---

## 11. 下一步

1. 用 M0 探针回答 §3.2 的三个问题（需要安装插件 → 待用户确认）。
2. 探针结果决定：顶部栏 seat 是否成立、每轮条目用 `assistant-actions` 还是 `turnTail`、投影 key 是否直连 client。
3. 定稿 Config 默认值（价格/峰谷/节假日），再进 M1 数据层。

---

*本文档为设计稿，未包含实现代码；所有"待探针 / 未验证"标记项必须在 M0 关闭后才能进入 M2+。*
