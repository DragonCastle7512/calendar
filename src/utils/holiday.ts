// @ts-ignore
import { Solar } from 'lunar-javascript';

const lunarCache: { [key: string]: string | null } = {};

export const getLunarHoliday = (date: Date) => {
  const cacheKey = date.toISOString().split('T')[0];
  if (lunarCache[cacheKey] !== undefined) return lunarCache[cacheKey];

  const solar = Solar.fromDate(date);
  const lunar = solar.getLunar();
  const m = lunar.getMonth();
  const d = lunar.getDay();
  const weekDay = date.getDay();

  let result: string | null = null;

  if (m === 1 && d === 1) result = '설날';
  else if (m === 1 && d === 2) result = '설날';
  else if (m === 4 && d === 8) result = '부처님오신날';
  else if (m === 8 && d === 14) result = '추석';
  else if (m === 8 && d === 15) result = '추석';
  else if (m === 8 && d === 16) result = '추석';
  else {
    const tomorrowSolar = solar.next(1);
    const tomorrowLunar = tomorrowSolar.getLunar();
    if (tomorrowLunar.getMonth() === 1 && tomorrowLunar.getDay() === 1) result = '설날';
  }

  if (!result && weekDay === 1) {
    const checkSubstitute = (targetDate: Date) => {
      const s = Solar.fromDate(targetDate);
      const l = s.getLunar();
      const tm = l.getMonth();
      const td = l.getDay();
      if ((tm === 1 && td === 1) || (tm === 8 && td === 15)) return targetDate.getDay() === 0;
      if (tm === 4 && td === 8) return targetDate.getDay() === 0 || targetDate.getDay() === 6;
      return false;
    };

    const yesterday = new Date(date);
    yesterday.setDate(date.getDate() - 1);
    if (checkSubstitute(yesterday)) {
      result = '대체공휴일';
    } else {
      const d2 = new Date(date);
      d2.setDate(date.getDate() - 2);
      if (checkSubstitute(d2)) {
        const l2 = Solar.fromDate(d2).getLunar();
        if (l2.getMonth() === 1 || l2.getMonth() === 8) result = '대체공휴일';
      }
    }
  }

  lunarCache[cacheKey] = result;
  return result;
};
