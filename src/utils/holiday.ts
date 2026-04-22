// @ts-ignore
import { Solar } from 'lunar-javascript';

export const getLunarHoliday = (date: Date) => {
  const solar = Solar.fromDate(date);
  const lunar = solar.getLunar();
  const m = lunar.getMonth();
  const d = lunar.getDay();
  const weekDay = date.getDay();

  if (m === 1 && d === 1) return '설날';
  if (m === 1 && d === 2) return '설날';
  if (m === 4 && d === 8) return '부처님오신날';
  if (m === 8 && d === 14) return '추석';
  if (m === 8 && d === 15) return '추석';
  if (m === 8 && d === 16) return '추석';

  const tomorrowSolar = solar.next(1);
  const tomorrowLunar = tomorrowSolar.getLunar();
  if (tomorrowLunar.getMonth() === 1 && tomorrowLunar.getDay() === 1) return '설날';

  const checkSubstitute = (targetDate: Date) => {
    const s = Solar.fromDate(targetDate);
    const l = s.getLunar();
    const tm = l.getMonth();
    const td = l.getDay();
    
    if ((tm === 1 && td === 1) || (tm === 8 && td === 15)) {
      if (targetDate.getDay() === 0) return true;
    }
    if (tm === 4 && td === 8) {
      if (targetDate.getDay() === 0 || targetDate.getDay() === 6) return true;
    }
    return false;
  };

  if (weekDay === 1) {
    const yesterday = new Date(date);
    yesterday.setDate(date.getDate() - 1);
    if (checkSubstitute(yesterday)) return '대체공휴일';
    
    const dayBeforeYesterday = new Date(date);
    dayBeforeYesterday.setDate(date.getDate() - 2);
    if (checkSubstitute(dayBeforeYesterday)) {
       const l2 = Solar.fromDate(dayBeforeYesterday).getLunar();
       if (l2.getMonth() === 1 || l2.getMonth() === 8) return '대체공휴일';
    }
  }

  return null;
};
