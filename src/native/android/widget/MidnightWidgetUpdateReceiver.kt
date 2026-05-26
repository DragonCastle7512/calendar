package com.dstle.calendar.widget

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

class MidnightWidgetUpdateReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent?) {
    val action = intent?.action

    when (action) {
      WidgetUpdateScheduler.ACTION_MIDNIGHT_WIDGET_UPDATE -> {
        WidgetUpdateScheduler.requestWidgetUpdate(context)
        WidgetUpdateScheduler.scheduleNextMidnight(context)
      }
      Intent.ACTION_TIME_CHANGED,
      Intent.ACTION_TIMEZONE_CHANGED,
      Intent.ACTION_USER_PRESENT,
      "android.intent.action.TIME_SET",
      Intent.ACTION_MY_PACKAGE_REPLACED -> {
        WidgetUpdateScheduler.requestWidgetResetToCurrentMonth(context, action ?: "receiver")
        WidgetUpdateScheduler.scheduleNextMidnight(context)
      }
    }
  }
}
