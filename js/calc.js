/* ============================================================
 * calc.js — 學習時長計算
 * ============================================================ */
(function (global) {
  'use strict';

  const BASE_HOURS = { entry: 80, mid: 220, high: 500 };

  function ageFactor(ageKey) {
    return {
      'u18': 0.85, '18-25': 0.95, '26-35': 1.0,
      '36-50': 1.15, '50+': 1.30,
    }[ageKey] || 1.0;
  }

  function regionFactor(regionKey) {
    return {
      'native': 0.60, 'exposed': 0.85, 'zero': 1.00,
    }[regionKey] || 1.0;
  }

  function daysToTarget(baseHours, age, region, minutesPerDay) {
    const hours = baseHours * ageFactor(age) * regionFactor(region);
    return Math.ceil(hours / (minutesPerDay / 60));
  }

  function monthsOf(days) {
    const m = days / 30;
    return m < 1 ? Math.round(m * 10) / 10 : Math.round(m);
  }

  function estimate(user) {
    if (!user) return null;
    const { age, region, minutes } = user;
    return {
      entry: { days: daysToTarget(BASE_HOURS.entry, age, region, minutes), months: monthsOf(daysToTarget(BASE_HOURS.entry, age, region, minutes)) },
      mid:   { days: daysToTarget(BASE_HOURS.mid,   age, region, minutes), months: monthsOf(daysToTarget(BASE_HOURS.mid,   age, region, minutes)) },
      high:  { days: daysToTarget(BASE_HOURS.high,  age, region, minutes), months: monthsOf(daysToTarget(BASE_HOURS.high,  age, region, minutes)) },
    };
  }

  global.Calc = { estimate, daysToTarget, BASE_HOURS };
})(window);
