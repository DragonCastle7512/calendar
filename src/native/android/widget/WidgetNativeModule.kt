package com.dstle.calendar.widget;

import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class WidgetNativeModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {
    override fun getName(): String {
        return "WidgetNativeModule"
    }

    @ReactMethod
    fun saveLastRenderTime(time: Double) {
        WidgetUpdateScheduler.saveLastRenderTime(reactApplicationContext, time.toLong())
    }
}
