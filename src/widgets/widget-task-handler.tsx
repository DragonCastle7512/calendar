import AsyncStorage from '@react-native-async-storage/async-storage';
import React from 'react';
import { Linking } from 'react-native';
import type { WidgetTaskHandlerProps } from 'react-native-android-widget';
import { 
  FIXED_ANNIVERSARIES, 
  HOLIDAY_CACHE_KEY, 
  MEMO_STORAGE_KEY, 
  OFFLINE_HOLIDAYS, 
  WIDGET_FONT_SIZE_KEY,
  WIDGET_ALIGNMENT_KEY,
  WIDGET_SHOW_HOLIDAYS_KEY
} from '../constants/calendar';
import { MemosState } from '../types/calendar';
import { getDateKey } from '../utils/date';
import { getLunarHoliday } from '../utils/holiday';
import { MemoWidget } from './MemoWidget';

const WIDGET_DATE_KEY = '@widget_view_date';

export async function widgetTaskHandler(props: WidgetTaskHandlerProps) {
  try {
    switch (props.widgetAction) {
      case 'WIDGET_ADDED':
      case 'WIDGET_UPDATE':
      case 'WIDGET_RESIZED': {
        const [savedMemos, savedWidgetDate, savedFontSize, savedAlignment, savedShowHolidays] = await Promise.all([
          AsyncStorage.getItem(MEMO_STORAGE_KEY),
          AsyncStorage.getItem(WIDGET_DATE_KEY),
          AsyncStorage.getItem(WIDGET_FONT_SIZE_KEY),
          AsyncStorage.getItem(WIDGET_ALIGNMENT_KEY),
          AsyncStorage.getItem(WIDGET_SHOW_HOLIDAYS_KEY)
        ]);

        let memos: MemosState = savedMemos ? JSON.parse(savedMemos) : {};
        let viewDate = savedWidgetDate ? new Date(savedWidgetDate) : new Date();
        let fontSizeIndex = savedFontSize ? parseInt(savedFontSize, 10) : 1;
        let alignment = (savedAlignment as 'top' | 'center') || 'top';
        let showHolidays = savedShowHolidays !== null ? savedShowHolidays === 'true' : true;

        await render(props, viewDate, memos, fontSizeIndex, alignment, showHolidays);
        break;
      }
      case 'WIDGET_CLICK':
        if (props.clickAction && props.clickAction.startsWith('OPEN_DATE')) {
          const clickedDate = props.clickActionData?.date;
          if (clickedDate) {
            const url = `calendarapp://?date=${clickedDate}&source=widget`;
            await Linking.openURL(url);
          }
        } else if (props.clickAction === 'PREV_MONTH' || props.clickAction === 'NEXT_MONTH') {
          const [savedMemos, savedWidgetDate, savedFontSize, savedAlignment, savedShowHolidays] = await Promise.all([
            AsyncStorage.getItem(MEMO_STORAGE_KEY),
            AsyncStorage.getItem(WIDGET_DATE_KEY),
            AsyncStorage.getItem(WIDGET_FONT_SIZE_KEY),
            AsyncStorage.getItem(WIDGET_ALIGNMENT_KEY),
            AsyncStorage.getItem(WIDGET_SHOW_HOLIDAYS_KEY)
          ]);

          let memos: MemosState = savedMemos ? JSON.parse(savedMemos) : {};
          let viewDate = savedWidgetDate ? new Date(savedWidgetDate) : new Date();
          let fontSizeIndex = savedFontSize ? parseInt(savedFontSize, 10) : 1;
          let alignment = (savedAlignment as 'top' | 'center') || 'top';
          let showHolidays = savedShowHolidays !== null ? savedShowHolidays === 'true' : true;

          if (props.clickAction === 'PREV_MONTH') {
            viewDate.setMonth(viewDate.getMonth() - 1);
          } else {
            viewDate.setMonth(viewDate.getMonth() + 1);
          }
          
          AsyncStorage.setItem(WIDGET_DATE_KEY, viewDate.toISOString());
          await render(props, viewDate, memos, fontSizeIndex, alignment, showHolidays);
        } else if (props.clickAction === 'OPEN_SETTINGS_APP') {
          const url = 'calendarapp://?source=settings';
          await Linking.openURL(url);
        }
        break;
      default:
        break;
    }
  } catch (e) {
    console.error('Widget Task Error:', e);
  }
}

async function render(
  props: WidgetTaskHandlerProps, 
  viewDate: Date, 
  memos: MemosState, 
  fontSizeIndex: number,
  alignment: 'top' | 'center',
  showHolidays: boolean
) {
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const todayStr = getDateKey(new Date());

  const cacheKey = `${HOLIDAY_CACHE_KEY}${year}`;
  let apiHolidays = {};
  try {
    const saved = await AsyncStorage.getItem(cacheKey);
    if (saved) {
      const { data } = JSON.parse(saved);
      apiHolidays = data || {};
    }
  } catch (e) {}

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

  const holidays: { [key: string]: string } = {};
  const anniversaries: { [key: string]: string } = {};

  days.forEach(date => {
    const dKey = getDateKey(date);
    const mDay = dKey.slice(5);
    const holidayName = apiHolidays[dKey] || getLunarHoliday(date) || OFFLINE_HOLIDAYS[mDay];
    if (holidayName) holidays[dKey] = holidayName;
    const anniversaryName = FIXED_ANNIVERSARIES[mDay];
    if (anniversaryName) anniversaries[dKey] = anniversaryName;
  });

  props.renderWidget(
    <MemoWidget 
      year={year} 
      month={month} 
      days={rows} 
      memos={memos} 
      todayStr={todayStr}
      holidays={holidays}
      anniversaries={anniversaries}
      renderTime={Date.now()}
      fontSizeIndex={fontSizeIndex}
      alignment={alignment}
      showHolidays={showHolidays}
    />
  );
}
