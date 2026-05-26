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

async function getWidgetSettings(): Promise<AppSettings> {
  const unified = await AsyncStorage.getItem(WIDGET_SETTINGS_KEY);
  if (unified) {
    try {
      return JSON.parse(unified);
    } catch (e) {
      console.error('Failed to parse unified widget settings', e);
    }
  }

  // 값이 없는 경우 마이그레이션
  const [
    savedFontSize,
    savedAlignmentV,
    savedAlignmentH,
    savedShowHolidays,
    savedShowOtherMonths,
    savedHighlightType
  ] = await Promise.all([
    AsyncStorage.getItem(WIDGET_FONT_SIZE_KEY),
    AsyncStorage.getItem(WIDGET_ALIGNMENT_VERTICAL_KEY),
    AsyncStorage.getItem(WIDGET_ALIGNMENT_HORIZONTAL_KEY),
    AsyncStorage.getItem(WIDGET_SHOW_HOLIDAYS_KEY),
    AsyncStorage.getItem(WIDGET_SHOW_OTHER_MONTHS_KEY),
    AsyncStorage.getItem(WIDGET_MEMO_HIGHLIGHT_TYPE_KEY)
  ]);

  const settings: AppSettings = {
    fontSizeIndex: savedFontSize ? parseInt(savedFontSize, 10) : 1,
    alignmentVertical: (savedAlignmentV as 'top' | 'center') || 'top',
    alignmentHorizontal: (savedAlignmentH as 'left' | 'center') || 'left',
    showHolidays: savedShowHolidays !== null ? savedShowHolidays === 'true' : true,
    showOtherMonths: savedShowOtherMonths !== null ? savedShowOtherMonths === 'true' : true,
    memoHighlightType: (savedHighlightType as 'full' | 'text') || 'full',
  };

  await AsyncStorage.setItem(WIDGET_SETTINGS_KEY, JSON.stringify(settings));

  return settings;
}

export async function widgetTaskHandler(props: WidgetTaskHandlerProps) {
  try {
    const taskStartedAt = Date.now();

    switch (props.widgetAction) {
      case 'WIDGET_ADDED': {
        const [savedMemos, settings] = await Promise.all([
          AsyncStorage.getItem(MEMO_STORAGE_KEY),
          getWidgetSettings()
        ]);

        let memos: MemosState = savedMemos ? JSON.parse(savedMemos) : {};
        let viewDate = new Date();
        await Promise.all([
          AsyncStorage.removeItem(WIDGET_DATE_KEY),
          AsyncStorage.removeItem(WIDGET_NAV_TIMESTAMP_KEY),
          AsyncStorage.removeItem(WIDGET_NAV_ACTION_KEY),
          AsyncStorage.removeItem(WIDGET_NAV_STARTED_KEY),
          AsyncStorage.removeItem(WIDGET_RENDER_TIME_KEY)
        ]);

        await render(props, viewDate, memos, settings);
        break;
      }
      case 'WIDGET_UPDATE':
      case 'WIDGET_RESIZED': {
        const [
          savedMemos, 
          savedWidgetDate, 
          savedNavTimestamp, 
          settings,
          savedRenderTime
        ] = await Promise.all([
          AsyncStorage.getItem(MEMO_STORAGE_KEY),
          AsyncStorage.getItem(WIDGET_DATE_KEY),
          AsyncStorage.getItem(WIDGET_NAV_TIMESTAMP_KEY),
          getWidgetSettings(),
          AsyncStorage.getItem(WIDGET_RENDER_TIME_KEY)
        ]);

        let currentWidgetDate = savedWidgetDate;
        if (props.widgetAction === 'WIDGET_UPDATE') {
          const now = new Date();
          const lastRenderAt = savedRenderTime ? parseInt(savedRenderTime, 10) : 0;
          const isNewDay = lastRenderAt > 0 ? getDateKey(new Date(lastRenderAt)) !== getDateKey(now) : true;
          const isViewingOtherMonth = !!savedWidgetDate;

          if (!isNewDay && !isViewingOtherMonth) {
            break;
          }

          if (isNewDay || isViewingOtherMonth) {
            currentWidgetDate = null;
            await Promise.all([
              AsyncStorage.removeItem(WIDGET_DATE_KEY),
              AsyncStorage.removeItem(WIDGET_NAV_TIMESTAMP_KEY),
              AsyncStorage.removeItem(WIDGET_NAV_ACTION_KEY),
              AsyncStorage.removeItem(WIDGET_NAV_STARTED_KEY),
              AsyncStorage.removeItem(WIDGET_RENDER_TIME_KEY)
            ]);
          }
        }

        let memos: MemosState = savedMemos ? JSON.parse(savedMemos) : {};
        const lastNavAt = savedNavTimestamp ? parseInt(savedNavTimestamp, 10) : 0;
        const timeSinceLastNav = Number.isFinite(lastNavAt) && lastNavAt > 0
          ? Date.now() - lastNavAt
          : Infinity;
        let viewDate = currentWidgetDate && timeSinceLastNav <= WIDGET_NAV_STALE_MS
          ? new Date(currentWidgetDate)
          : new Date();
        if (isNaN(viewDate.getTime())) {
          viewDate = new Date();
        }
        const latestNavStarted = await AsyncStorage.getItem(WIDGET_NAV_STARTED_KEY);
        const latestNavStartedAt = latestNavStarted ? parseInt(latestNavStarted, 10) : 0;
        if (Number.isFinite(latestNavStartedAt) && latestNavStartedAt > taskStartedAt) {
          break;
        }

        await render(props, viewDate, memos, settings);
        break;
      }
      case 'WIDGET_CLICK':
        if (props.clickAction === 'RESET_TO_CURRENT_MONTH') {
          const [savedMemos, settings] = await Promise.all([
            AsyncStorage.getItem(MEMO_STORAGE_KEY),
            getWidgetSettings()
          ]);

          let memos: MemosState = savedMemos ? JSON.parse(savedMemos) : {};
          const viewDate = new Date();
          await Promise.all([
            AsyncStorage.removeItem(WIDGET_DATE_KEY),
            AsyncStorage.removeItem(WIDGET_NAV_TIMESTAMP_KEY),
            AsyncStorage.removeItem(WIDGET_NAV_ACTION_KEY),
            AsyncStorage.removeItem(WIDGET_NAV_STARTED_KEY),
            AsyncStorage.removeItem(WIDGET_RENDER_TIME_KEY)
          ]);

          await render(props, viewDate, memos, settings);
        }
        else if (props.clickAction === 'PREV_MONTH' || props.clickAction === 'NEXT_MONTH') {
          await AsyncStorage.setItem(WIDGET_NAV_STARTED_KEY, taskStartedAt.toString());
          const [savedMemos, savedWidgetDate, savedNavTimestamp, savedNavAction, savedFontSize, savedAlignmentV, savedAlignmentH, savedShowHolidays, savedShowOtherMonths, savedHighlightType] = await Promise.all([
            AsyncStorage.getItem(MEMO_STORAGE_KEY),
            AsyncStorage.getItem(WIDGET_DATE_KEY),
            AsyncStorage.getItem(WIDGET_NAV_TIMESTAMP_KEY),
            AsyncStorage.getItem(WIDGET_NAV_ACTION_KEY),
            AsyncStorage.getItem(WIDGET_FONT_SIZE_KEY),
            AsyncStorage.getItem(WIDGET_ALIGNMENT_VERTICAL_KEY),
            AsyncStorage.getItem(WIDGET_ALIGNMENT_HORIZONTAL_KEY),
            AsyncStorage.getItem(WIDGET_SHOW_HOLIDAYS_KEY),
            AsyncStorage.getItem(WIDGET_SHOW_OTHER_MONTHS_KEY),
            AsyncStorage.getItem(WIDGET_MEMO_HIGHLIGHT_TYPE_KEY)
          ]);

          const requestTime = Date.now();
          const lastNavAt = savedNavTimestamp ? parseInt(savedNavTimestamp, 10) : 0;
          const timeSinceLastNav = Number.isFinite(lastNavAt) && lastNavAt > 0
            ? requestTime - lastNavAt
            : Infinity;

          if (timeSinceLastNav >= 0 && timeSinceLastNav < WIDGET_NAV_DEBOUNCE_MS) {
            break;
          }

          const renderTime = Number(props.clickActionData?.renderTime);
          const savedRenderTime = await AsyncStorage.getItem(WIDGET_RENDER_TIME_KEY);
          const latestRenderTime = savedRenderTime ? parseInt(savedRenderTime, 10) : 0;
          if (
            Number.isFinite(renderTime) &&
            renderTime > 0 &&
            Number.isFinite(latestRenderTime) &&
            latestRenderTime > renderTime
          ) {
            break;
          }
          const navActionKey = Number.isFinite(renderTime) && renderTime > 0
            ? `${props.clickAction}:${renderTime}`
            : null;
          if (navActionKey && savedNavAction === navActionKey) {
            break;
          }

          let memos: MemosState = savedMemos ? JSON.parse(savedMemos) : {};
          const baseYear = Number(props.clickActionData?.baseYear);
          const baseMonth = Number(props.clickActionData?.baseMonth);
          const hasClickBaseDate = Number.isInteger(baseYear) && Number.isInteger(baseMonth);
          let viewDate = hasClickBaseDate
            ? new Date(baseYear, baseMonth, 1)
            : savedWidgetDate && timeSinceLastNav <= WIDGET_NAV_STALE_MS
            ? new Date(savedWidgetDate)
            : new Date();
          if (isNaN(viewDate.getTime())) {
            viewDate = new Date();
          }
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
              AsyncStorage.removeItem(WIDGET_NAV_TIMESTAMP_KEY),
              AsyncStorage.removeItem(WIDGET_NAV_ACTION_KEY),
              AsyncStorage.removeItem(WIDGET_NAV_STARTED_KEY),
              AsyncStorage.removeItem(WIDGET_RENDER_TIME_KEY)
            ]);
          } else {
            const updates = [
              AsyncStorage.setItem(WIDGET_DATE_KEY, viewDate.toISOString()),
              AsyncStorage.setItem(WIDGET_NAV_TIMESTAMP_KEY, requestTime.toString())
            ];
            if (navActionKey) {
              updates.push(AsyncStorage.setItem(WIDGET_NAV_ACTION_KEY, navActionKey));
            }
            await Promise.all(updates);
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
  const renderTime = Date.now();
  await AsyncStorage.setItem(WIDGET_RENDER_TIME_KEY, renderTime.toString());

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
