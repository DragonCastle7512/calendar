import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useRef, useState } from 'react';
import { HOLIDAY_CACHE_KEY, PROXY_TOKEN, PROXY_URL } from '../constants/calendar';

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
      if (!PROXY_URL) return;
      
      syncedYears.current.add(year);
      const response = await fetch(`${PROXY_URL}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ year, appId: PROXY_TOKEN }),
      });
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
