/**
 * 峰谷判定 / 计价 / 节假日表的回归测试。
 * 跑法：node test/peak.test.mjs（或 npm test）
 */
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { __test } from '../index.js'

const { isPeak, nextPeakChangeAt, costOf, beijingDay, useHolidays, loadHolidays } = __test
const at = (iso) => Date.parse(iso)

let passed = 0
function check(name, actual, expected) {
  assert.deepEqual(actual, expected, name)
  passed += 1
}

// ── 随包节假日表 ────────────────────────────────────────────────
const table = loadHolidays()
useHolidays(table.days)
check('年份覆盖', table.years, ['2026', '2027'])
check('工作日假期天数（2026 的 19 + 2027 的 18）', table.weekdayDays, 37)
check('来源', table.sources, ['packaged'])

// ── 普通工作日 ──────────────────────────────────────────────────
check('周四上午高峰', isPeak(at('2026-11-26T10:00:00+08:00')), true)
check('9:00 起高峰', isPeak(at('2026-11-26T09:00:00+08:00')), true)
check('11:59 仍高峰', isPeak(at('2026-11-26T11:59:00+08:00')), true)
check('12:00 转谷价', isPeak(at('2026-11-26T12:00:00+08:00')), false)
check('13:59 仍谷价', isPeak(at('2026-11-26T13:59:00+08:00')), false)
check('14:00 回高峰', isPeak(at('2026-11-26T14:00:00+08:00')), true)
check('17:59 仍高峰', isPeak(at('2026-11-26T17:59:00+08:00')), true)
check('18:00 转谷价', isPeak(at('2026-11-26T18:00:00+08:00')), false)
check('周六谷价', isPeak(at('2026-11-28T10:00:00+08:00')), false)
check('调休补班的周日仍谷价', isPeak(at('2026-01-04T10:00:00+08:00')), false)

// ── 法定节假日（上游 0.2.2 这里全判错） ──────────────────────────
check('2026 春节周二', isPeak(at('2026-02-17T10:00:00+08:00')), false)
check('2026 春节周一', isPeak(at('2026-02-23T15:00:00+08:00')), false)
check('2026 端午周五', isPeak(at('2026-06-19T15:00:00+08:00')), false)
check('2026 国庆周四', isPeak(at('2026-10-01T10:00:00+08:00')), false)
check('2026 清明周一', isPeak(at('2026-04-06T10:00:00+08:00')), false)
check('2027 端午周三', isPeak(at('2027-06-09T10:00:00+08:00')), false)
check('2027 中秋周三', isPeak(at('2027-09-15T10:00:00+08:00')), false)
check('节后首日恢复高峰', isPeak(at('2027-10-08T10:00:00+08:00')), true)
check('2026 元旦当天', isPeak(at('2026-01-01T09:30:00+08:00')), false)

// ── 倒计时切换点 ────────────────────────────────────────────────
check('08:59 → 09:00', nextPeakChangeAt(at('2026-11-26T08:59:00+08:00')), at('2026-11-26T09:00:00+08:00'))
check('11:59 → 12:00', nextPeakChangeAt(at('2026-11-26T11:59:00+08:00')), at('2026-11-26T12:00:00+08:00'))
check('13:10 → 14:00', nextPeakChangeAt(at('2026-11-26T13:10:00+08:00')), at('2026-11-26T14:00:00+08:00'))
check('周五 18:30 → 下周一 09:00', nextPeakChangeAt(at('2026-11-27T18:30:00+08:00')), at('2026-11-30T09:00:00+08:00'))
check('春节前夜 → 节后首日 09:00', nextPeakChangeAt(at('2026-02-13T18:30:00+08:00')), at('2026-02-24T09:00:00+08:00'))
check('节前上午 → 当天 09:00', nextPeakChangeAt(at('2026-02-13T08:00:00+08:00')), at('2026-02-13T09:00:00+08:00'))

// ── 计价：节假日按谷价 ──────────────────────────────────────────
const usage = { inputTokens: 1000, cacheReadTokens: 2000, outputTokens: 500 }
check('工作日峰价', costOf(usage, 'deepseek-flash', at('2026-11-26T10:00:00+08:00')), 0.00608)
check('工作日谷价', costOf(usage, 'deepseek-flash', at('2026-11-26T12:30:00+08:00')), 0.00304)
check('节假日按谷价', costOf(usage, 'deepseek-flash', at('2026-02-17T10:00:00+08:00')), 0.00304)
check('北京时间自然日', beijingDay(at('2026-11-26T23:30:00+08:00')), '2026-11-26')
check('跨 UTC 零点仍算北京当天', beijingDay(at('2026-11-26T00:30:00+08:00')), '2026-11-26')

// ── 覆盖文件：合并、坏文件跳过、非法日期过滤 ────────────────────
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'hud-holidays-'))
fs.writeFileSync(path.join(tmp, 'holidays.json'), JSON.stringify({ years: { '2028': ['2028-01-03', 'bad-date', 42] } }))
const merged = loadHolidays(tmp)
check('覆盖文件被合并', merged.days.has('2028-01-03'), true)
check('覆盖文件计入年份', merged.years, ['2026', '2027', '2028'])
check('非法日期被丢弃', merged.days.has('bad-date'), false)
check('覆盖写入后即生效', (useHolidays(merged.days), isPeak(at('2028-01-03T10:00:00+08:00'))), false)
fs.writeFileSync(path.join(tmp, 'holidays.json'), '{ 坏掉的 json')
const broken = loadHolidays(tmp)
check('坏 JSON 只退回随包表', broken.sources, ['packaged'])
useHolidays(table.days)
fs.rmSync(tmp, { recursive: true, force: true })

console.log('peak.test: ' + passed + '/' + passed + ' passed')
