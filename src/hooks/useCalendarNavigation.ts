import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef } from 'react';
import { BackHandler, InteractionManager, Platform, ToastAndroid } from 'react-native';

interface NavigationStates {
  settingsVisible: boolean;
  isSettingsFromWidget: boolean;
  widgetSelectedDate: string | null;
  modalVisible: boolean;
  selectedDate: string | null;
}

interface NavigationActions {
  setSettingsVisible: (v: boolean) => void;
  setIsSettingsFromWidget: (v: boolean) => void;
  setWidgetSelectedDate: (v: string | null) => void;
  setModalVisible: (v: boolean) => void;
  setSelectedDate: (v: string | null) => void;
  setViewDate: (v: Date) => void;
  setWidgetViewDateState: (v: Date) => void;
}

export const useCalendarNavigation = (
  states: NavigationStates,
  actions: NavigationActions
) => {
  const router = useRouter();
  const params = useLocalSearchParams();
  const lastBackPressed = useRef<number>(0);

  // Deep Link Handling
  useEffect(() => {
    const urlDate = params.date as string;
    const urlSource = params.source as string;

    if (urlSource === 'settings' || params.settings === 'true') {
      actions.setIsSettingsFromWidget(true);
      actions.setSettingsVisible(true);
      InteractionManager.runAfterInteractions(() => {
        router.setParams({ source: undefined, settings: undefined });
      });
    } else if (urlDate) {
      const targetDate = new Date(urlDate);
      if (!isNaN(targetDate.getTime())) {
        InteractionManager.runAfterInteractions(() => {
          actions.setViewDate(targetDate);
          if (urlSource === 'widget') {
            actions.setWidgetSelectedDate(urlDate);
            actions.setSelectedDate(null);
            actions.setWidgetViewDateState(new Date(targetDate.getFullYear(), targetDate.getMonth(), 1));
          } else {
            actions.setSelectedDate(urlDate);
            actions.setWidgetSelectedDate(null);
          }
          actions.setModalVisible(false);
          router.setParams({ date: undefined, source: undefined });
        });
      }
    }
  }, [params.date, params.source, params.settings]);

  // Back Button Handling
  useEffect(() => {
    const backAction = () => {
      if (states.settingsVisible) {
        if (states.isSettingsFromWidget) {
          BackHandler.exitApp();
        } else {
          actions.setSettingsVisible(false);
        }
        return true;
      }
      if (states.widgetSelectedDate) {
        if (states.modalVisible) {
          actions.setModalVisible(false);
          return true;
        }
        actions.setWidgetSelectedDate(null);
        BackHandler.exitApp(); 
        return true;
      }
      if (states.modalVisible) {
        actions.setModalVisible(false);
        return true;
      }
      if (states.selectedDate) {
        actions.setSelectedDate(null);
        return true;
      }
      const currentTime = Date.now();
      if (currentTime - lastBackPressed.current < 2000) {
        BackHandler.exitApp();
        return true;
      }
      lastBackPressed.current = currentTime;
      if (Platform.OS === 'android') {
        ToastAndroid.show('뒤로 가기 버튼을 한 번 더 누르면 종료됩니다.', ToastAndroid.SHORT);
      }
      return true;
    };
    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => backHandler.remove();
  }, [states, actions]);

  return { params };
};
