import AsyncStorage from '@react-native-async-storage/async-storage';
import React from 'react';
import type { WidgetTaskHandlerProps } from 'react-native-android-widget';
import {
  FIXED_ANNIVERSARIES,
  HOLIDAY_CACHE_KEY,
  MEMO_STORAGE_KEY,
  OFFLINE_HOLIDAYS,
  WIDGET_ALIGNMENT_HORIZONTAL_KEY,
  WIDGET_ALIGNMENT_VERTICAL_KEY,
  WIDGET_FONT_SIZE_KEY,
  WIDGET_SHOW_HOLIDAYS_KEY,
  WIDGET_SHOW_OTHER_MONTHS_KEY,
  WIDGET_MEMO_HIGHLIGHT_TYPE_KEY,
  WIDGET_DATE_KEY,
  WIDGET_NAV_TIMESTAMP_KEY
} from '../constants/calendar';
import { AppSettings } from '../hooks/useSettings';
import { MemosState } from '../types/calendar';
import { getDateKey } from '../utils/date';
import { getLunarHoliday } from '../utils/holiday';
import { MemoWidget } from './MemoWidget';

export async function widgetTaskHandler(props: WidgetTaskHandlerProps) {
  try {
    switch (props.widgetAction) {
      case 'WIDGET_ADDED':
      case 'WIDGET_UPDATE':
      case 'WIDGET_RESIZED': {
        const [savedMemos, savedFontSize, savedAlignmentV, savedAlignmentH, savedShowHolidays, savedShowOtherMonths, savedHighlightType] = await Promise.all([
          AsyncStorage.getItem(MEMO_STORAGE_KEY),
          AsyncStorage.getItem(WIDGET_FONT_SIZE_KEY),
          AsyncStorage.getItem(WIDGET_ALIGNMENT_VERTICAL_KEY),
          AsyncStorage.getItem(WIDGET_ALIGNMENT_HORIZONTAL_KEY),
          AsyncStorage.getItem(WIDGET_SHOW_HOLIDAYS_KEY),
          AsyncStorage.getItem(WIDGET_SHOW_OTHER_MONTHS_KEY),
          AsyncStorage.getItem(WIDGET_MEMO_HIGHLIGHT_TYPE_KEY)
        ]);

        let memos: MemosState = savedMemos ? JSON.parse(savedMemos) : {};
        
        let viewDate = new Date();
        await Promise.all([
          AsyncStorage.removeItem(WIDGET_DATE_KEY),
          AsyncStorage.removeItem(WIDGET_NAV_TIMESTAMP_KEY)
        ]);

        const settings: AppSettings = {
          fontSizeIndex: savedFontSize ? parseInt(savedFontSize, 10) : 1,
          alignmentVertical: (savedAlignmentV as 'top' | 'center') || 'top',
          alignmentHorizontal: (savedAlignmentH as 'left' | 'center') || 'left',
          showHolidays: savedShowHolidays !== null ? savedShowHolidays === 'true' : true,
          showOtherMonths: savedShowOtherMonths !== null ? savedShowOtherMonths === 'true' : true,
          memoHighlightType: (savedHighlightType as 'full' | 'text') || 'full',
        };

        await render(props, viewDate, memos, settings);
        break;
      }
      case 'WIDGET_CLICK':
        if (props.clickAction === 'PREV_MONTH' || props.clickAction === 'NEXT_MONTH') {
          const [savedMemos, savedWidgetDate, savedFontSize, savedAlignmentV, savedAlignmentH, savedShowHolidays, savedShowOtherMonths, savedHighlightType] = await Promise.all([
            AsyncStorage.getItem(MEMO_STORAGE_KEY),
            AsyncStorage.getItem(WIDGET_DATE_KEY),
            AsyncStorage.getItem(WIDGET_FONT_SIZE_KEY),
            AsyncStorage.getItem(WIDGET_ALIGNMENT_VERTICAL_KEY),
            AsyncStorage.getItem(WIDGET_ALIGNMENT_HORIZONTAL_KEY),
            AsyncStorage.getItem(WIDGET_SHOW_HOLIDAYS_KEY),
            AsyncStorage.getItem(WIDGET_SHOW_OTHER_MONTHS_KEY),
            AsyncStorage.getItem(WIDGET_MEMO_HIGHLIGHT_TYPE_KEY)
          ]);

          let memos: MemosState = savedMemos ? JSON.parse(savedMemos) : {};
          let viewDate = savedWidgetDate ? new Date(savedWidgetDate) : new Date();
          const settings: AppSettings = {
            fontSizeIndex: savedFontSize ? parseInt(savedFontSize, 10) : 1,
            alignmentVertical: (savedAlignmentV as 'top' | 'center') || 'top',
            alignmentHorizontal: (savedAlignmentH as 'left' | 'center') || 'left',
            showHolidays: savedShowHolidays !== null ? savedShowHolidays === 'true' : true,
            showOtherMonths: savedShowOtherMonths !== null ? savedShowOtherMonths === 'true' : true,
            memoHighlightType: (savedHighlightType as 'full' | 'text') || 'full',
          };

          if (props.clickAction === 'PREV_MONTH') {
            viewDate.setMonth(viewDate.getMonth() - 1);
          } else {
            viewDate.setMonth(viewDate.getMonth() + 1);
          }
          
          const now = new Date();
          if (viewDate.getFullYear() === now.getFullYear() && viewDate.getMonth() === now.getMonth()) {
            await Promise.all([
              AsyncStorage.removeItem(WIDGET_DATE_KEY),
              AsyncStorage.removeItem(WIDGET_NAV_TIMESTAMP_KEY)
            ]);
          } else {
            await Promise.all([
              AsyncStorage.setItem(WIDGET_DATE_KEY, viewDate.toISOString()),
              AsyncStorage.setItem(WIDGET_NAV_TIMESTAMP_KEY, Date.now().toString())
            ]);
          }
          
          await render(props, viewDate, memos, settings);
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
  settings: AppSettings
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
      settings={settings}
      widgetHeight={props.widgetInfo?.height}
    />
  );
}
