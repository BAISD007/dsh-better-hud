/**
 * 法定节假日表：决定「工作日里哪些天按谷价」。
 *
 * 官方口径（DeepSeek 定价页）：高峰为北京时间周一至周五 9:00–12:00、14:00–18:00，
 * 但不含中国法定节假日；其余时段（含周末、以及调休补班的周末）全天空闲。
 * 所以这里只需要「放假日期」——周末本来就不参与，补班的周末也仍然算谷价。
 *
 * 数据来源按并集合并，任何一份读失败/被改坏都不影响其余：
 *   1. $DSH_HOME/usage-hud/holidays.json —— 覆盖用，升级或重装插件都不会丢
 *   2. <包根>/holidays.json            —— 随包分发的国务院安排
 *
 * 两份文件接受同样的结构，扁平数组也行，只为手改方便：
 *   { "years": { "2026": ["2026-01-01", ...], "2027": [...] } }
 *   { "days": ["2026-01-01", ...] }
 *   ["2026-01-01", ...]
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const DAY_RE = /^\d{4}-\d{2}-\d{2}$/
const PACKAGED_FILE = fileURLToPath(new URL('../holidays.json', import.meta.url))

/** 从任意受支持的结构里取出 YYYY-MM-DD 字符串。 */
function collectDays(value, out) {
  const push = (day) => {
    if (typeof day === 'string') {
      const trimmed = day.trim()
      if (DAY_RE.test(trimmed)) out.push(trimmed)
    }
  }
  if (Array.isArray(value)) {
    for (const day of value) push(day)
    return out
  }
  if (!value || typeof value !== 'object') return out
  push(value.day)
  if (Array.isArray(value.days)) for (const day of value.days) push(day)
  const years = value.years
  if (Array.isArray(years)) {
    for (const day of years) push(day)
  } else if (years && typeof years === 'object') {
    for (const list of Object.values(years)) {
      if (Array.isArray(list)) for (const day of list) push(day)
    }
  }
  return out
}

/** 周末的日期不参与计价（官方口径里周末永远谷价），统计时单独剔除。 */
function isWeekendDay(day) {
  const at = Date.parse(day + 'T00:00:00Z')
  if (!Number.isFinite(at)) return false
  const dow = new Date(at).getUTCDay()
  return dow === 0 || dow === 6
}

/**
 * 载入节假日表。
 * @param {string} [overrideDir] 覆盖文件所在目录（DSH_HOME/usage-hud）
 * @returns {{ days: Set<string>, years: string[], sources: string[], count: number, weekdayDays: number }}
 */
export function loadHolidays(overrideDir) {
  const files = []
  if (overrideDir) files.push({ source: 'user', file: path.join(overrideDir, 'holidays.json') })
  files.push({ source: 'packaged', file: PACKAGED_FILE })

  const days = new Set()
  const sources = []
  for (const { source, file } of files) {
    try {
      if (!fs.existsSync(file)) continue
      const parsed = JSON.parse(fs.readFileSync(file, 'utf8'))
      const list = collectDays(parsed, [])
      if (list.length === 0) continue
      for (const day of list) days.add(day)
      sources.push(source)
    } catch (error) {
      // 坏文件/坏 JSON 跳过：节假日表宁缺毋滥，不能因为一行手改错导致插件起不来。
    }
  }

  const years = [...new Set([...days].map((day) => day.slice(0, 4)))].sort()
  const weekdayDays = [...days].filter((day) => !isWeekendDay(day)).length
  return { days, years, sources, count: days.size, weekdayDays }
}
