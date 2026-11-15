package com.dstle.calendar.widget;

import android.appwidget.AppWidgetManager;
import android.content.Context;
import android.content.Intent;
import android.os.Bundle;
import android.util.Log;
import com.reactnativeandroidwidget.RNWidgetProvider;

public class Memo extends RNWidgetProvider {
  private static volatile boolean isNavigating = false;
  private static volatile long navigationStartTime = 0L;
  private static final long MAX_LOCK_TIMEOUT_MS = 5000L;

  public static void unlockNavigation() {
    isNavigating = false;
  }

  @Override
  public void onReceive(Context context, Intent intent) {
    long now = System.currentTimeMillis();
    String action = intent != null ? intent.getAction() : "null";
    String clickAction = intent != null ? intent.getStringExtra("clickAction") : null;
    int widgetId = intent != null ? intent.getIntExtra("widgetId", -1) : -1;
    int intentHash = intent != null ? System.identityHashCode(intent) : 0;

    if (intent != null) {
      Bundle bundle = intent.getBundleExtra("clickActionData");
      if (bundle == null) {
        bundle = new Bundle();
        intent.putExtra("clickActionData", bundle);
      }
      bundle.putLong("nativeDispatchTime", now);
    }

    if ("PREV_MONTH".equals(clickAction) || "NEXT_MONTH".equals(clickAction)) {
      if (isNavigating && (now - navigationStartTime > MAX_LOCK_TIMEOUT_MS)) {
        Log.w("WIDGET_CLICK_NATIVE", "[Memo onReceive] Navigation lock timed out after " + (now - navigationStartTime) + "ms. Auto-releasing.");
        isNavigating = false;
      }

      if (isNavigating) {
        Log.w("WIDGET_CLICK_NATIVE", "[Memo onReceive] DROPPED click! Widget is currently rendering (Navigation Lock active). action=" + clickAction);
        return;
      }

      isNavigating = true;
      navigationStartTime = now;
      Log.d("WIDGET_CLICK_NATIVE", "[Memo onReceive] Navigation lock ACQUIRED for " + clickAction);
    }

    Log.d("WIDGET_CLICK_NATIVE", "[Memo onReceive] PASS TO WORKER -> ACTION=" + action +
        ", clickAction=" + clickAction +
        ", widgetId=" + widgetId +
        ", now=" + now +
        ", intentHash=" + intentHash);

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
