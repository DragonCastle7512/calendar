import AsyncStorage from '@react-native-async-storage/async-storage';
import React from 'react';
import { Linking } from 'react-native';
import type { WidgetTaskHandlerProps } from 'react-native-android-widget';
import { HOLIDAY_CACHE_KEY, MEMO_STORAGE_KEY, OFFLINE_HOLIDAYS, FIXED_ANNIVERSARIES } from '../constants/calendar';
import { MemosState } from '../types/calendar';
import { getDateKey } from '../utils/date';
import { getLunarHoliday } from '../utils/holiday';
import { MemoWidget } from './MemoWidget';

const WIDGET_DATE_KEY = '@widget_view_date';
let cachedHolidays: { [key: string]: string } = {};

export async function widgetTaskHandler(props: WidgetTaskHandlerProps) {
  try {
    // 1. 데이터 로드
    const [savedMemos, savedWidgetDate] = await Promise.all([
      AsyncStorage.getItem(MEMO_STORAGE_KEY),
      AsyncStorage.getItem(WIDGET_DATE_KEY)
    ]);

    let memos: MemosState = savedMemos ? JSON.parse(savedMemos) : {};
    let viewDate = savedWidgetDate ? new Date(savedWidgetDate) : new Date();

    // 2. 액션 처리
    switch (props.widgetAction) {
      case 'WIDGET_ADDED':
      case 'WIDGET_UPDATE':
      case 'WIDGET_RESIZED':
        await render(props, viewDate, memos);
        case 'WIDGET_CLICK':
          if (props.clickAction === 'OPEN_DATE') {
            const clickedDate = props.clickActionData?.date;
            if (clickedDate) {
              Linking.openURL(`calendarapp://?date=${clickedDate}&source=widget`);
            }
          } else if (props.clickAction === 'PREV_MONTH') {
          viewDate.setMonth(viewDate.getMonth() - 1);
          await AsyncStorage.setItem(WIDGET_DATE_KEY, viewDate.toISOString());
          await render(props, viewDate, memos);
        } else if (props.clickAction === 'NEXT_MONTH') {
          viewDate.setMonth(viewDate.getMonth() + 1);
          await AsyncStorage.setItem(WIDGET_DATE_KEY, viewDate.toISOString());
          await render(props, viewDate, memos);
        }
        break;
      default:
        break;
    }
  } catch (e) {
    console.error('Widget Task Error:', e);
  }
}

async function render(props: WidgetTaskHandlerProps, viewDate: Date, memos: MemosState) {
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const todayStr = getDateKey(new Date());

  // 1. 공휴일 캐시 확인 및 로드
  const cacheKey = `${HOLIDAY_CACHE_KEY}${year}`;
  if (!cachedHolidays[cacheKey]) {
    try {
      const saved = await AsyncStorage.getItem(cacheKey);
      if (saved) {
        const { data } = JSON.parse(saved);
        cachedHolidays[cacheKey] = data;
      }
    } catch (e) {}
  }
  const apiHolidays = cachedHolidays[cacheKey] || {};

  // 2. 달력 생성
  const firstDay = new Date(year, month, 1).getDay();
  const lastDate = new Date(year, month + 1, 0).getDate();
  const prevMonthLastDate = new Date(year, month, 0).getDate();
  const days: Date[] = [];
  for (let i = firstDay - 1; i >= 0; i--) days.push(new Date(year, month - 1, prevMonthLastDate - i));
  for (let i = 1; i <= lastDate; i++) days.push(new Date(year, month, i));
  let nextDate = 1;
  while (days.length < 42) days.push(new Date(year, month + 1, nextDate++));
  const rows: Date[][] = [];
  for (let i = 0; i < 42; i += 7) rows.push(days.slice(i, i + 7));

  // 3. 앱과 동일한 휴일/기념일 데이터 구조 생성
  const holidays: { [key: string]: string } = {};
  const anniversaries: { [key: string]: string } = {};

  days.forEach(date => {
    const dKey = getDateKey(date);
    const mDay = dKey.slice(5);

    // 우선순위: API 공휴일 > 음력 명절 > 오프라인 공휴일
    const holidayName = apiHolidays[dKey] || getLunarHoliday(date) || OFFLINE_HOLIDAYS[mDay];
    if (holidayName) {
      holidays[dKey] = holidayName;
    }

    // 기념일 (빨간날 아님)
    const anniversaryName = FIXED_ANNIVERSARIES[mDay];
    if (anniversaryName) {
      anniversaries[dKey] = anniversaryName;
    }
  });

  // 4. 위젯 렌더링
  props.renderWidget(
    <MemoWidget 
      year={year} 
      month={month} 
      days={rows} 
      memos={memos} 
      todayStr={todayStr}
      holidays={holidays}
      anniversaries={anniversaries}
    />
  );
}
