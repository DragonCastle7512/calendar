package com.dstle.calendar.widget;

import android.appwidget.AppWidgetManager;
import android.content.Context;
import com.reactnativeandroidwidget.RNWidgetProvider;

public class Memo extends RNWidgetProvider {
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
