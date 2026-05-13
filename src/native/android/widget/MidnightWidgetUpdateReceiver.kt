package com.dstle.calendar.widget

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

class MidnightWidgetUpdateReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent?) {
    when (intent?.action) {
      WidgetUpdateScheduler.ACTION_MIDNIGHT_WIDGET_UPDATE -> {
        WidgetUpdateScheduler.requestWidgetUpdate(context)
        WidgetUpdateScheduler.scheduleNextMidnight(context)
      }
      Intent.ACTION_BOOT_COMPLETED,
      Intent.ACTION_TIME_CHANGED,
      Intent.ACTION_TIMEZONE_CHANGED,
      Intent.ACTION_MY_PACKAGE_REPLACED -> {
        WidgetUpdateScheduler.scheduleNextMidnight(context)
      }
    }
  }
}
