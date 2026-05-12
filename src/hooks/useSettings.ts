import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useState } from 'react';
import {
  APP_ALIGNMENT_HORIZONTAL_KEY,
  APP_ALIGNMENT_VERTICAL_KEY,
  APP_FONT_SIZE_KEY,
  APP_SHOW_HOLIDAYS_KEY,
  APP_SHOW_OTHER_MONTHS_KEY,
  APP_MEMO_HIGHLIGHT_TYPE_KEY,
  WIDGET_ALIGNMENT_HORIZONTAL_KEY,
  WIDGET_ALIGNMENT_VERTICAL_KEY,
  WIDGET_FONT_SIZE_KEY,
  WIDGET_SHOW_HOLIDAYS_KEY,
  WIDGET_SHOW_OTHER_MONTHS_KEY,
  WIDGET_MEMO_HIGHLIGHT_TYPE_KEY
} from '../constants/calendar';

export interface AppSettings {
  fontSizeIndex: number;
  alignmentVertical: 'top' | 'center';
  alignmentHorizontal: 'left' | 'center';
  showHolidays: boolean;
  showOtherMonths: boolean;
  memoHighlightType: 'full' | 'text';
}

export const useSettings = () => {
  const [widgetSettings, setWidgetSettings] = useState<AppSettings>({
    fontSizeIndex: 1,
    alignmentVertical: 'top',
    alignmentHorizontal: 'left',
    showHolidays: true,
    showOtherMonths: true,
    memoHighlightType: 'full',
  });

  const [appSettings, setAppSettings] = useState<AppSettings>({
    fontSizeIndex: 1,
    alignmentVertical: 'top',
    alignmentHorizontal: 'left',
    showHolidays: true,
    showOtherMonths: true,
    memoHighlightType: 'full',
  });

  const loadSettings = useCallback(async () => {
    try {
      const [
        savedWidgetFontSize,
        savedWidgetAlignmentV,
        savedWidgetAlignmentH,
        savedWidgetShowHolidays,
        savedWidgetShowOtherMonths,
        savedWidgetHighlightType,
        savedAppFontSize,
        savedAppAlignmentV,
        savedAppAlignmentH,
        savedAppShowHolidays,
        savedAppShowOtherMonths,
        savedAppHighlightType,
      ] = await Promise.all([
        AsyncStorage.getItem(WIDGET_FONT_SIZE_KEY),
        AsyncStorage.getItem(WIDGET_ALIGNMENT_VERTICAL_KEY),
        AsyncStorage.getItem(WIDGET_ALIGNMENT_HORIZONTAL_KEY),
        AsyncStorage.getItem(WIDGET_SHOW_HOLIDAYS_KEY),
        AsyncStorage.getItem(WIDGET_SHOW_OTHER_MONTHS_KEY),
        AsyncStorage.getItem(WIDGET_MEMO_HIGHLIGHT_TYPE_KEY),
        AsyncStorage.getItem(APP_FONT_SIZE_KEY),
        AsyncStorage.getItem(APP_ALIGNMENT_VERTICAL_KEY),
        AsyncStorage.getItem(APP_ALIGNMENT_HORIZONTAL_KEY),
        AsyncStorage.getItem(APP_SHOW_HOLIDAYS_KEY),
        AsyncStorage.getItem(APP_SHOW_OTHER_MONTHS_KEY),
        AsyncStorage.getItem(APP_MEMO_HIGHLIGHT_TYPE_KEY),
      ]);

      if (savedWidgetFontSize) setWidgetSettings(prev => ({ ...prev, fontSizeIndex: parseInt(savedWidgetFontSize, 10) }));
      if (savedWidgetAlignmentV) setWidgetSettings(prev => ({ ...prev, alignmentVertical: savedWidgetAlignmentV as 'top' | 'center' }));
      if (savedWidgetAlignmentH) setWidgetSettings(prev => ({ ...prev, alignmentHorizontal: savedWidgetAlignmentH as 'left' | 'center' }));
      if (savedWidgetShowHolidays) setWidgetSettings(prev => ({ ...prev, showHolidays: savedWidgetShowHolidays === 'true' }));
      if (savedWidgetShowOtherMonths) setWidgetSettings(prev => ({ ...prev, showOtherMonths: savedWidgetShowOtherMonths === 'true' }));
      if (savedWidgetHighlightType) setWidgetSettings(prev => ({ ...prev, memoHighlightType: savedWidgetHighlightType as 'full' | 'text' }));

      if (savedAppFontSize) setAppSettings(prev => ({ ...prev, fontSizeIndex: parseInt(savedAppFontSize, 10) }));
      if (savedAppAlignmentV) setAppSettings(prev => ({ ...prev, alignmentVertical: savedAppAlignmentV as 'top' | 'center' }));
      if (savedAppAlignmentH) setAppSettings(prev => ({ ...prev, alignmentHorizontal: savedAppAlignmentH as 'left' | 'center' }));
      if (savedAppShowHolidays) setAppSettings(prev => ({ ...prev, showHolidays: savedAppShowHolidays === 'true' }));
      if (savedAppShowOtherMonths) setAppSettings(prev => ({ ...prev, showOtherMonths: savedAppShowOtherMonths === 'true' }));
      if (savedAppHighlightType) setAppSettings(prev => ({ ...prev, memoHighlightType: savedAppHighlightType as 'full' | 'text' }));
    } catch (e) {
      console.error('Failed to load settings', e);
    }
  }, []);

  const updateWidgetSettings = useCallback(async (settings: Partial<AppSettings>) => {
    setWidgetSettings(prev => {
      const newSettings = { ...prev, ...settings };
      Promise.all([
        AsyncStorage.setItem(WIDGET_FONT_SIZE_KEY, newSettings.fontSizeIndex.toString()),
        AsyncStorage.setItem(WIDGET_ALIGNMENT_VERTICAL_KEY, newSettings.alignmentVertical),
        AsyncStorage.setItem(WIDGET_ALIGNMENT_HORIZONTAL_KEY, newSettings.alignmentHorizontal),
        AsyncStorage.setItem(WIDGET_SHOW_HOLIDAYS_KEY, newSettings.showHolidays.toString()),
        AsyncStorage.setItem(WIDGET_SHOW_OTHER_MONTHS_KEY, newSettings.showOtherMonths.toString()),
        AsyncStorage.setItem(WIDGET_MEMO_HIGHLIGHT_TYPE_KEY, newSettings.memoHighlightType),
      ]);
      return newSettings;
    });
  }, []);

  const updateAppSettings = useCallback(async (settings: Partial<AppSettings>) => {
    setAppSettings(prev => {
      const newSettings = { ...prev, ...settings };
      Promise.all([
        AsyncStorage.setItem(APP_FONT_SIZE_KEY, newSettings.fontSizeIndex.toString()),
        AsyncStorage.setItem(APP_ALIGNMENT_VERTICAL_KEY, newSettings.alignmentVertical),
        AsyncStorage.setItem(APP_ALIGNMENT_HORIZONTAL_KEY, newSettings.alignmentHorizontal),
        AsyncStorage.setItem(APP_SHOW_HOLIDAYS_KEY, newSettings.showHolidays.toString()),
        AsyncStorage.setItem(APP_SHOW_OTHER_MONTHS_KEY, newSettings.showOtherMonths.toString()),
        AsyncStorage.setItem(APP_MEMO_HIGHLIGHT_TYPE_KEY, newSettings.memoHighlightType),
      ]);
      return newSettings;
    });
  }, []);

  return {
    widgetSettings,
    appSettings,
    loadSettings,
    updateWidgetSettings,
    updateAppSettings,
  };
};
