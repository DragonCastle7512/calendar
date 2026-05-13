package com.dstle.calendar.widget

import android.app.AlarmManager
import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.os.Build
import java.util.Calendar

object WidgetUpdateScheduler {
  const val ACTION_MIDNIGHT_WIDGET_UPDATE = "com.dstle.calendar.ACTION_MIDNIGHT_WIDGET_UPDATE"
  private const val REQUEST_CODE_MIDNIGHT = 88421

  fun scheduleNextMidnight(context: Context) {
    if (!hasWidgets(context)) {
      cancel(context)
      return
    }

    val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
    val pendingIntent = createPendingIntent(context)
    val nextMidnightMillis = calculateNextMidnightMillis()

    try {
      if (canUseExactAlarm(alarmManager)) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
          alarmManager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, nextMidnightMillis, pendingIntent)
        } else {
          alarmManager.setExact(AlarmManager.RTC_WAKEUP, nextMidnightMillis, pendingIntent)
        }
      } else {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
          alarmManager.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, nextMidnightMillis, pendingIntent)
        } else {
          alarmManager.set(AlarmManager.RTC_WAKEUP, nextMidnightMillis, pendingIntent)
        }
      }
    } catch (_: SecurityException) {
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
        alarmManager.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, nextMidnightMillis, pendingIntent)
      } else {
        alarmManager.set(AlarmManager.RTC_WAKEUP, nextMidnightMillis, pendingIntent)
      }
    }
  }

  fun cancel(context: Context) {
    val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
    alarmManager.cancel(createPendingIntent(context))
  }

  fun requestWidgetUpdate(context: Context) {
    val appWidgetManager = AppWidgetManager.getInstance(context)
    val provider = ComponentName(context, Memo::class.java)
    val appWidgetIds = appWidgetManager.getAppWidgetIds(provider)
    if (appWidgetIds.isEmpty()) return

    val updateIntent = Intent(context, Memo::class.java).apply {
      action = AppWidgetManager.ACTION_APPWIDGET_UPDATE
      putExtra(AppWidgetManager.EXTRA_APPWIDGET_IDS, appWidgetIds)
    }
    context.sendBroadcast(updateIntent)
  }

  private fun hasWidgets(context: Context): Boolean {
    val appWidgetManager = AppWidgetManager.getInstance(context)
    val provider = ComponentName(context, Memo::class.java)
    return appWidgetManager.getAppWidgetIds(provider).isNotEmpty()
  }

  private fun createPendingIntent(context: Context): PendingIntent {
    val intent = Intent(context, MidnightWidgetUpdateReceiver::class.java).apply {
      action = ACTION_MIDNIGHT_WIDGET_UPDATE
    }
    val flags = PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
    return PendingIntent.getBroadcast(context, REQUEST_CODE_MIDNIGHT, intent, flags)
  }

  private fun calculateNextMidnightMillis(): Long {
    val now = Calendar.getInstance()
    val nextMidnight = Calendar.getInstance().apply {
      add(Calendar.DAY_OF_MONTH, 1)
      set(Calendar.HOUR_OF_DAY, 0)
      set(Calendar.MINUTE, 0)
      set(Calendar.SECOND, 0)
      set(Calendar.MILLISECOND, 0)
    }
    if (nextMidnight.timeInMillis <= now.timeInMillis) {
      nextMidnight.add(Calendar.DAY_OF_MONTH, 1)
    }
    return nextMidnight.timeInMillis
  }

  private fun canUseExactAlarm(alarmManager: AlarmManager): Boolean {
    return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
      alarmManager.canScheduleExactAlarms()
    } else {
      true
    }
  }
}
