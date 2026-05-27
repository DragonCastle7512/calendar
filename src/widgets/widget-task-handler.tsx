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
  WIDGET_DATE_KEY,
  WIDGET_FONT_SIZE_KEY,
  WIDGET_MEMO_HIGHLIGHT_TYPE_KEY,
  WIDGET_NAV_ACTION_KEY,
  WIDGET_NAV_DEBOUNCE_MS,
  WIDGET_NAV_STALE_MS,
  WIDGET_NAV_STARTED_KEY,
  WIDGET_NAV_TIMESTAMP_KEY,
  WIDGET_RENDER_TIME_KEY,
  WIDGET_SETTINGS_KEY,
  WIDGET_SHOW_HOLIDAYS_KEY,
  WIDGET_SHOW_OTHER_MONTHS_KEY
} from '../constants/calendar';
import { AppSettings } from '../hooks/useSettings';
import { MemosState } from '../types/calendar';
import { getDateKey } from '../utils/date';
import { getLunarHoliday } from '../utils/holiday';
import { MemoWidget } from './MemoWidget';

async function getWidgetSettings(allValues: Record<string, string | null>): Promise<AppSettings> {
  const unified = allValues[WIDGET_SETTINGS_KEY];
  if (unified) {
    try {
      return JSON.parse(unified);
    } catch (e) {
      // console.error('Failed to parse unified widget settings', e);
    }
  }

  // 값이 없는 경우 마이그레이션 및 기본값 설정
  const settings: AppSettings = {
    fontSizeIndex: allValues[WIDGET_FONT_SIZE_KEY] ? parseInt(allValues[WIDGET_FONT_SIZE_KEY]!, 10) : 1,
    alignmentVertical: (allValues[WIDGET_ALIGNMENT_VERTICAL_KEY] as 'top' | 'center') || 'top',
    alignmentHorizontal: (allValues[WIDGET_ALIGNMENT_HORIZONTAL_KEY] as 'left' | 'center') || 'left',
    showHolidays: allValues[WIDGET_SHOW_HOLIDAYS_KEY] !== null ? allValues[WIDGET_SHOW_HOLIDAYS_KEY] === 'true' : true,
    showOtherMonths: allValues[WIDGET_SHOW_OTHER_MONTHS_KEY] !== null ? allValues[WIDGET_SHOW_OTHER_MONTHS_KEY] === 'true' : true,
    memoHighlightType: (allValues[WIDGET_MEMO_HIGHLIGHT_TYPE_KEY] as 'full' | 'text') || 'full',
  };

  await AsyncStorage.setItem(WIDGET_SETTINGS_KEY, JSON.stringify(settings));

  return settings;
}

export async function widgetTaskHandler(props: WidgetTaskHandlerProps) {
  const taskStartedAt = Date.now();
  // console.log(`[WIDGET_TRACE] Task started: ${props.widgetAction} at ${taskStartedAt}`);

  try {
    const keys = [
      MEMO_STORAGE_KEY,
      WIDGET_DATE_KEY,
      WIDGET_NAV_TIMESTAMP_KEY,
      WIDGET_NAV_ACTION_KEY,
      WIDGET_NAV_STARTED_KEY,
      WIDGET_RENDER_TIME_KEY,
      WIDGET_SETTINGS_KEY,
      WIDGET_FONT_SIZE_KEY,
      WIDGET_ALIGNMENT_VERTICAL_KEY,
      WIDGET_ALIGNMENT_HORIZONTAL_KEY,
      WIDGET_SHOW_HOLIDAYS_KEY,
      WIDGET_SHOW_OTHER_MONTHS_KEY,
      WIDGET_MEMO_HIGHLIGHT_TYPE_KEY
    ];

    const results = await AsyncStorage.multiGet(keys);
    const allValues = Object.fromEntries(results);

    const settings = await getWidgetSettings(allValues);
    const savedMemos = allValues[MEMO_STORAGE_KEY];
    let memos: MemosState = savedMemos ? JSON.parse(savedMemos) : {};

    switch (props.widgetAction) {
      case 'WIDGET_ADDED': {
        const renderTime = Date.now();
        // console.log('[WIDGET_TRACE] WIDGET_ADDED: Resetting state');
        await resetNavigationState(renderTime);
        await render(props, new Date(), memos, settings, renderTime);
        break;
      }

      case 'WIDGET_UPDATE':
      case 'WIDGET_RESIZED': {
        const savedWidgetDate = allValues[WIDGET_DATE_KEY];
        const savedNavTimestamp = allValues[WIDGET_NAV_TIMESTAMP_KEY];
        const lastNavAt = savedNavTimestamp ? parseInt(savedNavTimestamp, 10) : 0;
        const timeSinceLastNav = Number.isFinite(lastNavAt) && lastNavAt > 0
          ? taskStartedAt - lastNavAt
          : Infinity;

        let viewDate = savedWidgetDate && timeSinceLastNav <= WIDGET_NAV_STALE_MS
          ? new Date(savedWidgetDate)
          : new Date();
        
        if (isNaN(viewDate.getTime())) viewDate = new Date();

        // console.log(`[WIDGET_TRACE] ${props.widgetAction}: Rendering ${viewDate.toISOString()}`);
        await render(props, viewDate, memos, settings);
        break;
      }

      case 'WIDGET_CLICK': {
        const action = props.clickAction;
        // console.log(`[WIDGET_TRACE] WIDGET_CLICK: ${action}`);

        if (action === 'RESET_TO_CURRENT_MONTH') {
          const reason = props.clickActionData?.reason;
          // console.log(`[WIDGET_TRACE] RESET_TO_CURRENT_MONTH: Full reset (reason: ${reason})`);
          const renderTime = Date.now();
          await resetNavigationState(renderTime);
          await render(props, new Date(), memos, settings, renderTime);
        } else if (action === 'PREV_MONTH' || action === 'NEXT_MONTH') {
          const clickTime = Date.now();
          const renderTime = Number(props.clickActionData?.renderTime);
          
          const savedNavTimestamp = allValues[WIDGET_NAV_TIMESTAMP_KEY];
          const lastNavAt = savedNavTimestamp ? parseInt(savedNavTimestamp, 10) : 0;
          
          if (Number.isFinite(renderTime) && renderTime > 0 && lastNavAt > renderTime) {
            // console.log(`[WIDGET_TRACE] Blocking stale click: renderTime(${renderTime}) < lastNavAt(${lastNavAt})`);
            break;
          }

          const navActionKey = `${action}:${renderTime}`;
          const savedNavAction = allValues[WIDGET_NAV_ACTION_KEY];
          if (navActionKey === savedNavAction) {
            // console.log(`[WIDGET_TRACE] Blocking duplicate action: ${navActionKey}`);
            break;
          }

          const timeSinceLastNav = clickTime - lastNavAt;
          if (timeSinceLastNav < WIDGET_NAV_DEBOUNCE_MS) {
            // console.log(`[WIDGET_TRACE] Debouncing: ${timeSinceLastNav}ms < ${WIDGET_NAV_DEBOUNCE_MS}ms`);
            break;
          }

          const baseYear = Number(props.clickActionData?.baseYear);
          const baseMonth = Number(props.clickActionData?.baseMonth);
          const savedWidgetDate = allValues[WIDGET_DATE_KEY];

          let viewDate = (Number.isInteger(baseYear) && Number.isInteger(baseMonth))
            ? new Date(baseYear, baseMonth, 1)
            : savedWidgetDate ? new Date(savedWidgetDate) : new Date();

          if (isNaN(viewDate.getTime())) viewDate = new Date();

          if (action === 'PREV_MONTH') {
            viewDate.setMonth(viewDate.getMonth() - 1);
          } else {
            viewDate.setMonth(viewDate.getMonth() + 1);
          }

          const now = new Date();
          const isCurrentMonth = viewDate.getFullYear() === now.getFullYear() && viewDate.getMonth() === now.getMonth();

          if (isCurrentMonth) {
            // console.log('[WIDGET_TRACE] Navigated to current month: Clearing state');
            const renderTime = Date.now();
            await resetNavigationState(renderTime);
            await render(props, viewDate, memos, settings, renderTime);
          } else {
            // console.log(`[WIDGET_TRACE] Navigating to ${viewDate.toISOString()}`);
            await AsyncStorage.multiSet([
              [WIDGET_DATE_KEY, viewDate.toISOString()],
              [WIDGET_NAV_TIMESTAMP_KEY, clickTime.toString()],
              [WIDGET_NAV_ACTION_KEY, navActionKey]
            ]);
            await render(props, viewDate, memos, settings);
          }
        }
        break;
      }
    }
  } catch (e) {
    // console.error('[WIDGET_TRACE] Task Error:', e);
  } finally {
    // console.log(`[WIDGET_TRACE] Task End: Total Time ${Date.now() - startTime}ms`);
  }
}

async function resetNavigationState(renderTime: number) {
  await AsyncStorage.multiSet([
    [WIDGET_NAV_TIMESTAMP_KEY, renderTime.toString()],
    [WIDGET_DATE_KEY, ""],
    [WIDGET_NAV_ACTION_KEY, ""],
    [WIDGET_NAV_STARTED_KEY, ""]
  ]);
}

async function render(
  props: WidgetTaskHandlerProps, 
  viewDate: Date, 
  memos: MemosState, 
  settings: AppSettings,
  renderTime: number = Date.now()
) {
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const todayStr = getDateKey(new Date());

  await AsyncStorage.multiSet([
    [WIDGET_RENDER_TIME_KEY, renderTime.toString()],
    [WIDGET_NAV_TIMESTAMP_KEY, renderTime.toString()]
  ]);

  // console.log(`[WIDGET_TRACE] Rendering ${year}-${month + 1}, renderTime: ${renderTime}`);

  const cacheKey = `${HOLIDAY_CACHE_KEY}${year}`;
  let apiHolidays: { [key: string]: string } = {};
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
      renderTime={renderTime}
      settings={settings}
      widgetHeight={props.widgetInfo?.height}
    />
  );
}
