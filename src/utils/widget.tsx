import AsyncStorage from '@react-native-async-storage/async-storage';
import React from 'react';
import { InteractionManager, Platform } from 'react-native';
import { requestWidgetUpdate } from 'react-native-android-widget';
import { FIXED_ANNIVERSARIES, OFFLINE_HOLIDAYS, WIDGET_DATE_KEY, WIDGET_NAV_TIMESTAMP_KEY } from '../constants/calendar';
import { MemosState } from '../types/calendar';
import { getDateKey } from '../utils/date';
import { getLunarHoliday } from '../utils/holiday';
import { MemoWidget } from '../widgets/MemoWidget';

import { AppSettings } from '../hooks/useSettings';

interface WidgetUpdateData {
  memos: MemosState;
  settings: AppSettings;
  viewDate: Date;
  holidays: { [key: string]: string };
}

export const triggerWidgetUpdate = async (data: WidgetUpdateData) => {
  if (Platform.OS !== 'android') return;

  try {
    const now = new Date();
    const isCurrentMonth = 
      data.viewDate.getFullYear() === now.getFullYear() && 
      data.viewDate.getMonth() === now.getMonth();
    
    if (isCurrentMonth) {
      await Promise.all([
        AsyncStorage.removeItem(WIDGET_DATE_KEY),
        AsyncStorage.removeItem(WIDGET_NAV_TIMESTAMP_KEY)
      ]);
    } else {
      await AsyncStorage.setItem(WIDGET_DATE_KEY, data.viewDate.toISOString());
      await AsyncStorage.setItem(WIDGET_NAV_TIMESTAMP_KEY, Date.now().toString());
    }
  } catch (e) {
    console.log('[DEBUG] Failed to sync widget date:', e);
  }

  InteractionManager.runAfterInteractions(() => {
    setTimeout(async () => {
      try {
        const { 
          memos, 
          settings,
          viewDate, 
          holidays 
        } = data;
        const year = viewDate.getFullYear();
        const month = viewDate.getMonth();
        const todayStr = getDateKey(new Date());

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

        const widgetHolidays: { [key: string]: string } = {};
        const widgetAnniversaries: { [key: string]: string } = {};
        days.forEach(d => {
          const dKey = getDateKey(d);
          const mDay = dKey.slice(5);
          const hName = holidays[dKey] || getLunarHoliday(d) || OFFLINE_HOLIDAYS[mDay];
          if (hName) widgetHolidays[dKey] = hName;
          const aName = FIXED_ANNIVERSARIES[mDay];
          if (aName) widgetAnniversaries[dKey] = aName;
        });

        requestWidgetUpdate({
          widgetName: 'Memo',
          renderWidget: (widgetInfo) => (
            <MemoWidget 
              year={year} 
              month={month} 
              days={rows} 
              memos={memos} 
              todayStr={todayStr} 
              holidays={widgetHolidays} 
              anniversaries={widgetAnniversaries} 
              renderTime={Date.now()}
              settings={settings}
              widgetHeight={widgetInfo.height}
            />
          ),
          widgetNotFound: () => {}
        });
      } catch (e) {
        console.log('[DEBUG] Widget Update Error:', e);
      }
    }, 50);
  });
};
