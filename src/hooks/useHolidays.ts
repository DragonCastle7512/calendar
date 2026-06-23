import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useRef, useState } from 'react';
import { HOLIDAY_API_KEY, HOLIDAY_API_URL, HOLIDAY_CACHE_KEY } from '../constants/calendar';

export const useHolidays = () => {
  const [holidays, setHolidays] = useState<{ [date: string]: string }>({});
  const syncedYears = useRef<Set<number>>(new Set());

  const syncHolidays = useCallback(async (year: number) => {
    if (syncedYears.current.has(year)) return;
    const cacheKey = `${HOLIDAY_CACHE_KEY}${year}`;
    try {
      const saved = await AsyncStorage.getItem(cacheKey);
      if (saved) {
        const { data } = JSON.parse(saved);
        if (data) {
          syncedYears.current.add(year);
          setHolidays(prev => ({ ...prev, ...data }));
          return;
        }
      }
      if (!HOLIDAY_API_URL || !HOLIDAY_API_KEY) return;
      
      syncedYears.current.add(year);
      
      const hasPercent = HOLIDAY_API_KEY.includes('%');
      const serviceKey = hasPercent ? HOLIDAY_API_KEY : encodeURIComponent(HOLIDAY_API_KEY);
      const url = `${HOLIDAY_API_URL}?serviceKey=${serviceKey}&solYear=${year}&numOfRows=100&_type=json`;
      
      const response = await fetch(url);
      if (response.ok) {
        const resData = await response.json();
        const holidayMap: { [key: string]: string } = {};
        const items = resData?.response?.body?.items?.item;
        if (items) {
          const itemList = Array.isArray(items) ? items : [items];
          itemList.forEach((item: any) => {
            if (item.isHoliday === 'Y') {
              const strDate = String(item.locdate);
              const formattedDate = `${strDate.slice(0, 4)}-${strDate.slice(4, 6)}-${strDate.slice(6, 8)}`;
              holidayMap[formattedDate] = item.dateName;
            }
          });
        }
        setHolidays(prev => ({ ...prev, ...holidayMap }));
        await AsyncStorage.setItem(cacheKey, JSON.stringify({ data: holidayMap, timestamp: Date.now() }));
      } else {
        syncedYears.current.delete(year);
      }
    } catch (e) {
      syncedYears.current.delete(year);
    }
  }, []);

  return {
    holidays,
    syncHolidays,
  };
};
