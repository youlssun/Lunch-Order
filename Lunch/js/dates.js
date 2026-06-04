/**
 * Week / cutoff utilities — America/Chicago (CST/CDT)
 */
const CHICAGO_TZ = "America/Chicago";
const DOW_EN = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const DOW_MAP = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
const CANCEL_HOUR = 9;
const CANCEL_MINUTE = 0;

function pad2(n) {
  return String(n).padStart(2, "0");
}

function getChicagoParts(date) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: CHICAGO_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    weekday: "short",
  });
  const parts = formatter.formatToParts(date);
  const get = function (type) {
    const part = parts.find(function (p) {
      return p.type === type;
    });
    return part ? part.value : "";
  };
  return {
    year: Number(get("year")),
    month: Number(get("month")),
    day: Number(get("day")),
    hour: Number(get("hour")),
    minute: Number(get("minute")),
    weekday: get("weekday"),
  };
}

function nowChicago() {
  return new Date();
}

function toDateKeyFromParts(y, m, d) {
  return `${y}-${pad2(m)}-${pad2(d)}`;
}

function toDateKey(d) {
  return toDateKeyFromParts(d.getFullYear(), d.getMonth() + 1, d.getDate());
}

function chicagoDateKey(date) {
  const p = getChicagoParts(date || nowChicago());
  return toDateKeyFromParts(p.year, p.month, p.day);
}

function parseDateKey(key) {
  const [y, m, d] = key.split("-").map(Number);
  return { year: y, month: m, day: d };
}

function addCalendarDays(y, m, d, days) {
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  return {
    year: dt.getUTCFullYear(),
    month: dt.getUTCMonth() + 1,
    day: dt.getUTCDate(),
  };
}

function getMondayOfWeek(refDate) {
  const p = getChicagoParts(refDate);
  const dow = DOW_MAP[p.weekday] ?? 0;
  const diff = dow === 0 ? -6 : 1 - dow;
  return addCalendarDays(p.year, p.month, p.day, diff);
}

function getWeekdayKeys(refDate) {
  const monday = getMondayOfWeek(refDate);
  const keys = [];
  for (let i = 0; i < 5; i++) {
    const d = addCalendarDays(monday.year, monday.month, monday.day, i);
    keys.push(toDateKeyFromParts(d.year, d.month, d.day));
  }
  return keys;
}

function formatDateLabel(dateKey) {
  const { year, month, day } = parseDateKey(dateKey);
  const dt = new Date(Date.UTC(year, month - 1, day));
  const dow = DOW_EN[dt.getUTCDay()];
  return `${dateKey} (${dow})`;
}

/** Before 9:00 AM Chicago on the order day */
function canEmployeeModify(dateKey, now) {
  const instant = now || nowChicago();
  const todayKey = chicagoDateKey(instant);
  if (dateKey > todayKey) return true;
  if (dateKey < todayKey) return false;

  const p = getChicagoParts(instant);
  if (p.hour < CANCEL_HOUR) return true;
  if (p.hour === CANCEL_HOUR && p.minute < CANCEL_MINUTE) return true;
  return false;
}

/** Mon–Fri this week (Chicago), today or later */
function isOrderableDay(dateKey, now) {
  const instant = now || nowChicago();
  const weekKeys = getWeekdayKeys(instant);
  if (!weekKeys.includes(dateKey)) return false;
  const todayKey = chicagoDateKey(instant);
  return dateKey >= todayKey;
}

function getCurrentWeekRangeLabel(now) {
  const keys = getWeekdayKeys(now || nowChicago());
  return `${keys[0]} ~ ${keys[4]}`;
}

function getMonthKeys(year, month) {
  const last = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const keys = [];
  for (let d = 1; d <= last; d++) {
    const dt = new Date(Date.UTC(year, month - 1, d));
    const dow = dt.getUTCDay();
    if (dow >= 1 && dow <= 5) {
      keys.push(toDateKeyFromParts(year, month, d));
    }
  }
  return keys;
}
