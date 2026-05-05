import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useState } from 'react';
import {
  APP_ALIGNMENT_KEY,
  APP_FONT_SIZE_KEY,
  APP_SHOW_HOLIDAYS_KEY,
  WIDGET_ALIGNMENT_KEY,
  WIDGET_FONT_SIZE_KEY,
  WIDGET_SHOW_HOLIDAYS_KEY
} from '../constants/calendar';

export interface AppSettings {
  fontSizeIndex: number;
  alignment: 'top' | 'center';
  showHolidays: boolean;
}

export const useSettings = () => {
  const [widgetSettings, setWidgetSettings] = useState<AppSettings>({
    fontSizeIndex: 1,
    alignment: 'top',
    showHolidays: true,
  });

  const [appSettings, setAppSettings] = useState<AppSettings>({
    fontSizeIndex: 1,
    alignment: 'top',
    showHolidays: true,
  });

  const loadSettings = useCallback(async () => {
    try {
      const [
        savedWidgetFontSize,
        savedWidgetAlignment,
        savedWidgetShowHolidays,
        savedAppFontSize,
        savedAppAlignment,
        savedAppShowHolidays,
      ] = await Promise.all([
        AsyncStorage.getItem(WIDGET_FONT_SIZE_KEY),
        AsyncStorage.getItem(WIDGET_ALIGNMENT_KEY),
        AsyncStorage.getItem(WIDGET_SHOW_HOLIDAYS_KEY),
        AsyncStorage.getItem(APP_FONT_SIZE_KEY),
        AsyncStorage.getItem(APP_ALIGNMENT_KEY),
        AsyncStorage.getItem(APP_SHOW_HOLIDAYS_KEY),
      ]);

      if (savedWidgetFontSize) setWidgetSettings(prev => ({ ...prev, fontSizeIndex: parseInt(savedWidgetFontSize, 10) }));
      if (savedWidgetAlignment) setWidgetSettings(prev => ({ ...prev, alignment: savedWidgetAlignment as 'top' | 'center' }));
      if (savedWidgetShowHolidays) setWidgetSettings(prev => ({ ...prev, showHolidays: savedWidgetShowHolidays === 'true' }));

      if (savedAppFontSize) setAppSettings(prev => ({ ...prev, fontSizeIndex: parseInt(savedAppFontSize, 10) }));
      if (savedAppAlignment) setAppSettings(prev => ({ ...prev, alignment: savedAppAlignment as 'top' | 'center' }));
      if (savedAppShowHolidays) setAppSettings(prev => ({ ...prev, showHolidays: savedAppShowHolidays === 'true' }));
    } catch (e) {
      console.error('Failed to load settings', e);
    }
  }, []);

  const updateWidgetSettings = useCallback(async (settings: Partial<AppSettings>) => {
    setWidgetSettings(prev => {
      const newSettings = { ...prev, ...settings };
      Promise.all([
        AsyncStorage.setItem(WIDGET_FONT_SIZE_KEY, newSettings.fontSizeIndex.toString()),
        AsyncStorage.setItem(WIDGET_ALIGNMENT_KEY, newSettings.alignment),
        AsyncStorage.setItem(WIDGET_SHOW_HOLIDAYS_KEY, newSettings.showHolidays.toString()),
      ]);
      return newSettings;
    });
  }, []);

  const updateAppSettings = useCallback(async (settings: Partial<AppSettings>) => {
    setAppSettings(prev => {
      const newSettings = { ...prev, ...settings };
      Promise.all([
        AsyncStorage.setItem(APP_FONT_SIZE_KEY, newSettings.fontSizeIndex.toString()),
        AsyncStorage.setItem(APP_ALIGNMENT_KEY, newSettings.alignment),
        AsyncStorage.setItem(APP_SHOW_HOLIDAYS_KEY, newSettings.showHolidays.toString()),
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
