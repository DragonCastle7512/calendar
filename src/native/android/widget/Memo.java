package com.dstle.calendar.widget;

import android.appwidget.AppWidgetManager;
import android.content.Context;
import android.content.Intent;
import com.reactnativeandroidwidget.RNWidgetProvider;

public class Memo extends RNWidgetProvider {
  @Override
  public void onReceive(Context context, Intent intent) {
    String action = intent.getAction();

    if (Intent.ACTION_USER_PRESENT.equals(action) ||
        Intent.ACTION_SCREEN_ON.equals(action) ||
        Intent.ACTION_TIME_CHANGED.equals(action) || 
        Intent.ACTION_TIMEZONE_CHANGED.equals(action) ||
        "android.intent.action.TIME_SET".equals(action)) {
      WidgetUpdateScheduler.INSTANCE.requestWidgetResetToCurrentMonth(context, action);
    }
    
    super.onReceive(context, intent);
  }

  @Override
  public void onEnabled(Context context) {
    super.onEnabled(context);
    WidgetUpdateScheduler.INSTANCE.scheduleNextMidnight(context);
  }

  @Override
  public void onDisabled(Context context) {
    super.onDisabled(context);
    WidgetUpdateScheduler.INSTANCE.cancel(context);
  }

  @Override
  public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
    super.onUpdate(context, appWidgetManager, appWidgetIds);
    WidgetUpdateScheduler.INSTANCE.scheduleNextMidnight(context);
  }
}
