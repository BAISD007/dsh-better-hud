# dsh-better-hud（用量与余额 HUD）

在 DeepSeek Harness（DSH）的**标题栏**上常驻一条用量信息：账户余额、今日已用、峰谷倒计时；同时在每条助手消息的动作行里补一个「本轮消耗」。全部通过官方槽位渲染，不替换、不遮挡任何官方 UI。

[![npm](https://img.shields.io/npm/v/dsh-better-hud?label=npm)](https://www.npmjs.com/package/dsh-better-hud)
[![license](https://img.shields.io/badge/license-MIT-green)](./LICENSE)
[![DeepSeek Harness](https://img.shields.io/badge/DeepSeek%20Harness-plugin-4D6BFE)](https://github.com/deepseek-ai/deepseek-harness)
[![GitHub stars](https://img.shields.io/github/stars/BAISD007/dsh-better-hud?style=flat)](https://github.com/BAISD007/dsh-better-hud)

> 版本 0.1.0，尚未发布 npm（npm 徽标在发布后生效）。设计取舍与阶段记录见 [ROUTE.md](./ROUTE.md)。

---

## 功能

### 标题栏 HUD

| 宽度 | 形态 |
|---|---|
| ≥ 1024px | `DeepSeek余额：¥ 24.38　今日已用：¥ 0.12　错峰优惠 00:53:24 后结束` |
| < 1024px | `¥ 24.38/0.12　00:53:24`（去标签，倒计时保留） |
| < 480px | `¥ 24.38　00:53`（只留余额 + 倒计时到分钟） |

- 三块内容（余额 / 今日已用 / 峰谷倒计时）可以在设置里**逐项开关**，也可以整条关闭。
- 高峰时段标签与倒计时用告警红，谷时用成功绿；颜色/字体/字号照抄标题栏「应用 / 编辑」菜单的 computed style。
- 倒计时按本机时钟逐秒跳动，到峰谷边界自动重拉一次。

### 每轮消耗

- 每条已定稿助手消息的动作行（复制/点赞/分支图标那一排）里追加：`本轮消耗：¥ 0.0184`。
- 金额 = 该条消息的真实 usage × DeepSeek 峰谷价目表；鼠标悬停可看到 token 合计与当时是峰价/谷价。
- 官方自带的 `用量 x.xM tok`、时间**保持原样**，插件不重复渲染。

### 官方模型检测

- 只有 `deepseek-official`（API Key 通道）和 `deepseek-account`（账号登录通道）判定为「官方」。
- 切到中转站/自定义渠道时（即使模型名同为 `DeepSeek-V4.1-Flash`），按非官方处理：**整条顶部栏不显示**（可设置关闭此行为）。
- 模型判定 1 秒内生效；切回官方后立即刷新余额。

### 设置页

设置 → **用量与余额 HUD**：

- 在标题栏显示用量信息（总开关）
- 显示内容：余额 / 今日已用 / 峰谷倒计时（任意增删）
- 显示每轮消耗（动作行那条 ¥）
- 当调用非 DeepSeek 官方模型时，不显示余额（默认开启）

---

## 安装

本包是标准 DSH bundle（`dsh.bundle.patch` + `dsh.client`），有两种安装方式。

### 方式 A：从 npm 安装（发布之后）

```bash
# 会话内插件管理器
plugin_manager install_bundle target="dsh-better-hud"

# 或命令行
dsh plugin --profile desktop add dsh-better-hud
```

升级 / 卸载（命令以你的 DSH 版本为准）：

```bash
dsh plugin --profile desktop update dsh-better-hud
dsh plugin --profile desktop remove dsh-better-hud
```

> 本包发布名为 `dsh-better-hud`（已确认 npm 上可用）。npm 上另有一个相近的 `dsh-usage-hud`（右下角多 Tab 用量面板，作者 ksk2023），与本插件不是同一个实现。

### 方式 B：本地目录安装（开发 / 内测）

把仓库放到任意固定目录，例如 `C:\Users\<你>\plugins\dsh-better-hud`。下面用 `<插件目录>` 指代这个绝对路径：

```powershell
# 会话内插件管理器：传绝对路径
plugin_manager install_bundle target="<插件目录>"

# 或命令行：link: 前缀表示本地链接
dsh plugin --profile desktop add link:<插件目录>
```

示例（换成你自己的路径）：

```powershell
plugin_manager install_bundle target="C:\Users\me\plugins\dsh-better-hud"
dsh plugin --profile desktop add link:C:\Users\me\plugins\dsh-better-hud
```

### 生效方式

- **首次安装后重启一次客户端**（宿主半身 `index.js` 只在启动时加载）；
- 之后改 `client.js` 只需 **Ctrl+F5**，改 `index.js` 仍需重启。

卸载：插件管理器里关闭/卸载，或 `remove_bundle`。账本与设置文件会保留在 `DSH_HOME/usage-hud/`，需要彻底清理时手动删除该目录。

### 维护者：发布到 npm

1. 包名已定为 `dsh-better-hud`（发布前可再确认一次 npm 上是否仍可用）；
2. 同步修改这三处：`package.json` 的 `name`、`cordis.patch.yml` 里 insert 行的 `name`、README 中的安装命令；
3. 去掉 `package.json` 的 `"private": true`，补充 `repository` / `homepage` / `bugs` / `author`；
4. 确认 `files` 覆盖 `README.md`、`index.js`、`client.js`、`cordis.patch.yml`、`locale/*.json`、`icon.svg`；
5. `npm login` 后执行 `npm publish`（`dsh-better-hud` 不是 scoped 包，不需要 `--access`）；
6. 每次发布前 bump `version`；已安装的包升级后需要重启客户端才生效。

> 本插件走 `dsh.client` 静态模块，安装后由宿主直接从 profile 的 `node_modules` 提供，不需要额外构建步骤。

---

## 工作原理

### 半身分工

```
dsh-better-hud/
  index.js            Host：余额、账本、模型跟踪、HTTP 路由
  client.js           Client：静态 client module，注册三个官方槽位
  cordis.patch.yml    bundle 入口（insert 一行）
  locale/{zh,en}.json 展示元数据
  icon.svg            插件图标
```

**Host（`index.js`）**

- `ctx.get('deepseekAccount')` 读账户余额（可选服务，绝不写进 `inject`）；5 秒缓存，`?force=1` 强制刷新；失败沿用上次成功值，不伪造 0。
- 余额观测账本：每次取到余额就观测一次，按北京时间自然日累计。
- `ctx.on('session/event')` 跟踪当前模型（`model/selection`、`request/context`、`assistant/message`），忽略 `origin: 'subagent'` 的子代理会话；启动时从存活会话日志补一次。
- 四个只读 HTTP 路由：

| 路由 | 用途 | 频率 |
|---|---|---|
| `GET /api/dsh-better-hud/state` | 设置 + 当前模型 + 峰谷（不碰余额、不调平台） | 客户端 1s |
| `GET /api/dsh-better-hud/summary` | 余额 + 今日已用 + 峰谷 + 设置 + 模型；`?force=1` 绕过缓存 | 30s 兜底 |
| `GET /api/dsh-better-hud/turn?sessionId=&messageId=` | 单条消息的真实 usage 与消耗 | 每条消息一次（有缓存） |
| `GET/POST /api/dsh-better-hud/settings` | 读写设置 | 打开设置页/保存时 |

**Client（`client.js`）**

静态 `__ModuleLoader__` 模块，注册三个槽位：

| 槽位 | id | order | 内容 |
|---|---|---|---|
| `shell.overlay` | `dsh-better-hud.topbar` | -100 | 标题栏 HUD；层本身点击穿透，不挡拖动 |
| `conversation.chat.assistant-actions` | `dsh-better-hud.turn-cost` | 100 | 每轮消耗（进官方动作行） |
| `settings.section` | `dsh-better-hud.settings` | 45 | 设置页「用量与余额 HUD」 |

样式只用 `--dsw-alias-*` 主题 token；标题栏字体/字号/字色在运行时读取「应用/编辑」菜单的 computed style 后照抄。

### 今日已用的口径

「今日已用」不是把每轮成本加起来，而是**余额观测账本**（与 `dsh-whale-widget` 同口径）：

- 每个北京时间自然日：首次观测记为开盘余额；之后余额**下降**累计为消费，**上升**（充值/赠金）单独记录、不冲消费；
- 全部用 1e8 定点整数记账，避免浮点误差；
- 当天首次观测如果晚于 00:00 超过 10 分钟，标记 `partialDay`（只显示「已观测」的量）；
- 账本落盘：`DSH_HOME/usage-hud/ledger.json`，临时文件 + rename 原子写；坏文件改名 `.corrupt-<时间戳>.bak` 后用默认结构重建；保留最近 120 天；
- 首次落盘时如果今天还没有观测行，会**一次性**从 `dsh-whale-widget` 的账本（`DSH_HOME/.dshw-usage.json`）继承今天的已观测消费（只读、只发生一次，之后不再读取）。

### 每轮消耗的口径

- 数据源：会话日志里 `assistant/message` 的 `usage`；
- DSH 的 usage 桶是**互斥**的：`total = input + cacheRead + cacheWrite + output`（实测 123/123 条消息成立，`inputTokens` 不含缓存命中部分）；
- 计价（CNY / 百万 token）：

```
cost = input × 未命中价 + cacheRead × 命中价 + output × 输出价
```

- 价格按**事件发生时刻**判峰谷；`cacheWriteTokens` 现行 DeepSeek 价目表未单独计价，按 0 处理；
- 未知模型（非 DeepSeek 价目表内的模型）不显示 ¥，避免瞎算。

### 价目表（默认值，与 `dsh-whale-widget` 对齐）

单位 CNY / 百万 token，`[谷价, 峰价]`：

| 模型 | 缓存命中 | 缓存未命中 | 输出 |
|---|---|---|---|
| `deepseek-flash`（V4.1 Flash） | 0.02 / 0.04 | 1 / 2 | 4 / 8 |
| `deepseek-v4-pro`（V4 Pro） | 0.15 / 0.30 | 4.5 / 9 | 13.5 / 27 |

形如 `deepseek-v4-flash`、`deepseek-v4-flash-vision-exp` 的旧名按 Flash 计价。

### 峰谷规则

- 高峰：北京时间**周一至周五（不含中国法定节假日）9:00–12:00、14:00–18:00**；
- 其余全部为谷价：周末、调休上班的周末、法定节假日全天；
- 谷价 = 高峰价 × 0.5。

> 节假日表（`HOLIDAYS`）目前为空，需要在每年国务院公布次年安排后补一年。

### 设置与数据文件

| 文件 | 内容 |
|---|---|
| `DSH_HOME/usage-hud/settings.json` | 设置（原子写） |
| `DSH_HOME/usage-hud/ledger.json` | 余额观测账本（最多 120 天） |

`DSH_HOME` 默认为 `~/.dsh`，其具体位置由运行环境的 `DSH_HOME` 环境变量决定。

---

## 与 `dsh-whale-widget` 的参考关系

本项目在**数据口径与算法**上大量参考了 [dsh-whale-widget](https://github.com/MeteorNOX/DeepSeek-Balance-Whale-Widget)（MIT），但**渲染路线完全不同**：它是宿主向页面注入脚本、自绘右下角挂件；我们走官方槽位 + 静态 client module。

### 参考了哪些部分

| 参考点 | 出处 | 在本项目中的用法 |
|---|---|---|
| 余额观测账本：开盘余额、下降=消费、上升=充值单列、1e8 定点、按账户×币种分本、10 分钟缺口判部分、坏文件备份重建 | `lib/accounting.mjs`、`lib/index.js` 账本 IO | 重写了同语义的 `observe()/loadLedger()/saveLedger()`，账本算法与文案口径对齐 |
| 余额取数：`ctx.get('deepseekAccount')` 可选服务、`getBalance({ version, locale, timezoneOffsetSeconds })`、缓存 + `force`、失败沿用旧值 | `lib/index.js`（含注释里的坑：账户服务绝不能进 `inject`） | Host 的 `readBalance()` 采用同一套调用与降级策略（缓存 5s，比它的 25s 更激进） |
| 每轮消耗计价口径：`input × 未命中 + cacheRead × 命中 + output × 输出`，按事件时刻判峰谷 | `lib/index.js` `costMsg` | 直接沿用其公式；并用会话日志验证了「usage 桶互斥」这个前提 |
| 价目表默认值、模型别名、谷价 = 峰价一半 | `README.md` 定价表、`PRICES` | 默认价目表与别名规则一致 |
| 峰谷时段与节假日规则（工作日 9–12 / 14–18，周末与法定节假日全天谷价） | `PEAK_HOURS` / `HOLIDAY_VALLEY_LIST` | 时段与周末规则一致；节假日表同样需要每年维护 |
| 账本落盘方式：DSH_HOME、temp+rename 原子写、损坏改名 `.bak` 后重建 | `lib/index.js` `ledgerIo` / `ledgerBackupCorrupt` | 同语义实现 |
| `last-turn.json` 每秒轮询的"看当前轮消耗"思路 | `assets/whale-widget.js`、`/dsh-whale/last-turn.json` | 弃用；改为按 messageId 查询 + 缓存（见「已知限制」） |
| 一次性迁移数据源 | `.dshw-usage.json` 账本结构 | 首次落盘时继承今日已观测消费 |

### 没有采用的部分

- 页面脚本注入（`tapIndex` / `webserver/index-inject`）与自绘 DOM 挂件；
- 鲸鱼角色/气泡/音效/随机语句等展示层；
- 多厂商余额查询与自定义 API 模板（本项目只查 DeepSeek 账户余额）；
- 其 `assets/` 下的美术与音频素材（不在 MIT 范围内，本项目未使用）。

### 许可与致谢

- 本项目代码为 MIT。
- 感谢 `dsh-whale-widget` 的作者 **月匠（MeteorNOX）** 与贡献者（含余额登录态、充值记账、周末谷价等修复的贡献者）——本项目没有整段复制其源文件，但账本算法、价目表、峰谷规则与计价口径来自对它的阅读与对齐。
- 若后续直接复用其 `lib/accounting.mjs` 代码，会在源文件与本节保留其 MIT 版权声明。

---

## 已知限制

- **今日已用是"已观测"口径**：只在界面开着、余额取得到的时候观测；当天首次观测晚于 00:00 的时长会计入 `partialDay`，界面上以「部分观测」提示。跨零点或长时间关机的那段消费不会被补记。
- **重启不丢账本，但装插件之前的历史补不回来**（当前实现有一次性的 whale 账本继承，仅限当天）。
- **模型判定取"最近一个非子代理会话"的模型事件**，不是"当前窗口正在看的会话"；单窗口使用无影响，多会话并行时可能滞后或跟错。
- **每轮消耗按消息单独 HTTP 查询**（带内存缓存）；超长会话首次打开时请求数较多，后续可换成会话级投影/批量接口。
- **价目表硬编码**在 `index.js`，官方调价需要改代码重新发版（后续可移到设置页）。
- **节假日表为空**，节假日当天会按工作日高峰计价；需每年补齐。
- **多币种/多厂商余额未实现**；非 DeepSeek 模型不显示每轮 ¥。
- `cacheWriteTokens` 未单独计价。

## 开发

- 改 `client.js` → 页面 Ctrl+F5；
- 改 `index.js` → 重启客户端；
- `.probe/` 是本地像素测量脚本（不在 `files` 里，不随包分发）；
- 设计稿与阶段计划见 [ROUTE.md](./ROUTE.md)。

## 许可

MIT（见 [LICENSE](./LICENSE)）。第三方参考与商标归属见上文「与 dsh-whale-widget 的参考关系」。

[![](https://img.shields.io/badge/powered_by-dsh-4D6BFE?style=flat-square&logo=deepseek&logoColor=white)](https://github.com/deepseek-ai/deepseek-harness)
