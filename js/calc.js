/* ============================================================
 * calc.js — 学习时长计算
 * 输入：age / region / minutes
 * 输出：{ entryDays, midDays, highDays, months }
 * ============================================================ */
(function (global) {
  'use strict';

  // 各等级基准学习小时数
  const BASE_HOURS = { entry: 80, mid: 220, high: 500 };

  // 年龄系数（年纪越小学语言越快）
  function ageFactor(ageKey) {
    return {
      'u18': 0.85,
      '18-25': 0.95,
      '26-35': 1.0,
      '36-50': 1.15,
      '50+': 1.30,
    }[ageKey] || 1.0;
  }

  // 地域系数（粤语区有天然基础）
  function regionFactor(regionKey) {
    return {
      'native': 0.60,    // 粤语区
      'exposed': 0.85,   // 听过/看过
      'zero': 1.00,      // 零基础
    }[regionKey] || 1.0;
  }

  // 每日分钟数 → 每日小时数
  function dailyHours(minutes) {
    return minutes / 60;
  }

  // 计算：达到目标等级需要的天数
  function daysToTarget(baseHours, age, region, minutesPerDay) {
    const hours = baseHours * ageFactor(age) * regionFactor(region);
    return Math.ceil(hours / dailyHours(minutesPerDay));
  }

  // 主函数：返回所有等级的天数 + 友好月数
  function estimate(user) {
    if (!user) return null;
    const { age, region, minutes } = user;
    const entryDays = daysToTarget(BASE_HOURS.entry, age, region, minutes);
    const midDays   = daysToTarget(BASE_HOURS.mid,   age, region, minutes);
    const highDays  = daysToTarget(BASE_HOURS.high,  age, region, minutes);
    return {
      entry: { days: entryDays, months: monthsOf(entryDays) },
      mid:   { days: midDays,   months: monthsOf(midDays)   },
      high:  { days: highDays,  months: monthsOf(highDays)  },
    };
  }

  function monthsOf(days) {
    // 用 30 天算一个月，最少显示 0.5 月
    const m = days / 30;
    return m < 1 ? Math.round(m * 10) / 10 : Math.round(m);
  }

  // 当前等级距离下一级还差多少
  function progressToNext(currentLevelKey, user) {
    if (!user) return null;
    const target = currentLevelKey === 'entry' ? 'mid'
                 : currentLevelKey === 'mid'   ? 'high'
                 : null;
    if (!target) return null;  // 高阶没有下一级
    const all = estimate(user);
    return {
      target,
      days: all[target].days,
      months: all[target].months,
    };
  }

  global.Calc = { estimate, progressToNext, daysToTarget, BASE_HOURS };
})(window);
