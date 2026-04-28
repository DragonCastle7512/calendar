import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { HEADER_HEIGHT, MONTH_NAMES } from '../constants/calendar';

interface CalendarHeaderProps {
  viewDate: Date;
  onChangeMonth: (offset: number) => void;
  onOpenSettings: () => void;
}

export const CalendarHeader = ({ viewDate, onChangeMonth, onOpenSettings }: CalendarHeaderProps) => {
  return (
    <View style={styles.header}>
        <TouchableOpacity onPress={onOpenSettings} style={styles.settingsBtn}>
          <Ionicons name="settings-outline" size={22} color="#8A8A8A" />
        </TouchableOpacity>     
        <View style={styles.headerContainer}>
          <TouchableOpacity onPress={() => onChangeMonth(-1)} style={styles.navBtn}>
            <Ionicons name="chevron-back" size={20} color="#cacaca" />
          </TouchableOpacity>
          <Text style={styles.headerDate}>{viewDate.getFullYear()}년 {MONTH_NAMES[viewDate.getMonth()]}</Text>
          <TouchableOpacity onPress={() => onChangeMonth(1)} style={styles.navBtn}>
            <Ionicons name="chevron-forward" size={20} color="#cacaca" />
          </TouchableOpacity>
        </View>
        <View style={styles.headerSpacer} />
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    height: HEADER_HEIGHT,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    backgroundColor: '#FFFFFF',
  },
  headerSpacer: { width: 44 },
  settingsBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerContainer: {
    flex: 1,
    flexDirection: 'row',
    gap: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerDate: {
    fontSize: 18,
    color: '#000000',
    fontWeight: '700',
  },
  navBtn: {
    width: 40, height: 40,
    alignItems: 'center', justifyContent: 'center',
  },
});
