const fs = require('fs');
const path = require('path');

function patchFile(filePath, targetContents, replacementContent, description) {
    if (!fs.existsSync(filePath)) {
        console.error(`Error: File not found - ${filePath}`);
        return false;
    }

    let content = fs.readFileSync(filePath, 'utf8').replace(/\r\n/g, '\n');
    const normalizedReplacement = replacementContent.replace(/\r\n/g, '\n');

    // If already patched with the correct replacement, we are done
    if (content.includes(normalizedReplacement)) {
        console.log(`[ALREADY PATCHED] ${description} in ${path.basename(filePath)}`);
        return true;
    }

    // Try each target content variant
    let matchedTarget = null;
    for (const target of (Array.isArray(targetContents) ? targetContents : [targetContents])) {
        const normalizedTarget = target.replace(/\r\n/g, '\n');
        if (content.includes(normalizedTarget)) {
            matchedTarget = normalizedTarget;
            break;
        }
    }

    if (!matchedTarget) {
        console.error(`[ERROR] Target code block not found for: ${description}`);
        return false;
    }

    const updatedContent = content.replace(matchedTarget, normalizedReplacement);
    
    if (updatedContent === content) {
        console.error(`[ERROR] Replacement resulted in no changes for: ${description}`);
        return false;
    }

    fs.writeFileSync(filePath, updatedContent, 'utf8');
    console.log(`[SUCCESS] Patched ${description} in ${path.basename(filePath)}`);
    return true;
}

// 1. Patch RNWidget.java
const rnWidgetPath = 'node_modules/react-native-android-widget/android/src/main/java/com/reactnativeandroidwidget/RNWidget.java';
const oldRegisterClickTask = `    private void registerClickTask(int id, ClickableView clickableView, RemoteViews widgetView, Integer button) {
        Intent intent = new Intent(appContext.getPackageName() + ".WIDGET_CLICK");
        intent.setComponent(new ComponentName(appContext, RNWidgetUtil.getWidgetProviderClassName(appContext, widgetName)));
        intent.putExtra("widgetId", id);
        intent.putExtra("clickAction", clickableView.getClickAction());
        intent.putExtra("clickActionData", Arguments.toBundle(clickableView.getClickActionData()));
        PendingIntent pendingIntent = PendingIntent.getBroadcast(
            appContext,
            (int) System.currentTimeMillis(),
            intent,
            PendingIntent.FLAG_CANCEL_CURRENT
                | PendingIntent.FLAG_MUTABLE
        );
        widgetView.setOnClickPendingIntent(button, pendingIntent);
    }`;

const newRegisterClickTask = `    private void registerClickTask(int id, ClickableView clickableView, RemoteViews widgetView, Integer button) {
        Intent intent = new Intent(appContext.getPackageName() + ".WIDGET_CLICK");
        intent.setComponent(new ComponentName(appContext, RNWidgetUtil.getWidgetProviderClassName(appContext, widgetName)));
        intent.putExtra("widgetId", id);
        intent.putExtra("clickAction", clickableView.getClickAction());
        intent.putExtra("clickActionData", Arguments.toBundle(clickableView.getClickActionData()));

        int deterministicRequestCode = id;
        if (clickableView.getClickAction() != null) {
            deterministicRequestCode += clickableView.getClickAction().hashCode();
        }
        if (clickableView.getClickActionData() != null) {
            deterministicRequestCode += clickableView.getClickActionData().toString().hashCode();
        }

        PendingIntent pendingIntent = PendingIntent.getBroadcast(
            appContext,
            deterministicRequestCode,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_MUTABLE
        );
        widgetView.setOnClickPendingIntent(button, pendingIntent);
    }`;

const p1Success = patchFile(
    rnWidgetPath,
    oldRegisterClickTask,
    newRegisterClickTask,
    "PendingIntent RequestCode with deterministic & NULL-safe version"
);

// 1a. Define tStart at the beginning of drawWidget in RNWidget.java
const oldDrawWidgetStartOriginal = `    public void drawWidget(int widgetId) throws Exception {
        ReadableMap light = config.getMap("light");
        ReadableMap dark = config.getMap("dark");`;

const oldDrawWidgetStartWithLogs = `    public void drawWidget(int widgetId) throws Exception {
        long tStart = System.currentTimeMillis();
        ReadableMap light = config.getMap("light");
        ReadableMap dark = config.getMap("dark");`;

const newDrawWidgetStart = `    public void drawWidget(int widgetId) throws Exception {
        long tStart = System.currentTimeMillis();
        ReadableMap light = config.getMap("light");
        ReadableMap dark = config.getMap("dark");`;

const p1aSuccess = patchFile(
    rnWidgetPath,
    [oldDrawWidgetStartOriginal, oldDrawWidgetStartWithLogs],
    newDrawWidgetStart,
    "long tStart variable definition in drawWidget"
);

// 1b. Patch RNWidget.java for Dual-Phase Rendering (Visuals First, Clickables Second)
// Variant A: Original clean package code (without debug profiling logs)
const oldDrawWidgetClickableSectionOriginal = `        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
            addClickableAreas(widgetId, remoteWidgetView, widgetWithViews);
        }
        addCollectionViews(widgetId, remoteWidgetView, widgetWithViews);

        AppWidgetManager.getInstance(appContext)
            .updateAppWidget(widgetId, remoteWidgetView);`;

// Variant B: Local workspace code (with debug profiling logs)
const oldDrawWidgetClickableSectionWithLogs = `        long tBeforeClickables = System.currentTimeMillis();

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
            addClickableAreas(widgetId, remoteWidgetView, widgetWithViews);
        }
        addCollectionViews(widgetId, remoteWidgetView, widgetWithViews);

        long tAfterClickables = System.currentTimeMillis();
        android.util.Log.d("WIDGET_NATIVE", "[PROFILE] addClickableAreas (RemoteViews setup): " + (tAfterClickables - tBeforeClickables) + "ms");

        AppWidgetManager.getInstance(appContext)
            .updateAppWidget(widgetId, remoteWidgetView);

        long tEnd = System.currentTimeMillis();
        android.util.Log.d("WIDGET_NATIVE", "[PROFILE] updateAppWidget (IPC Call): " + (tEnd - tAfterClickables) + "ms");
        android.util.Log.d("WIDGET_NATIVE", "[NATIVE] drawWidgetById END. Native Render Time: " + (tEnd - tStart) + "ms");`;

const newDrawWidgetClickableSection = `        long tBeforeClickables = System.currentTimeMillis();

        // --- DUAL-PHASE RENDER (PHASE 1: VISUALS ONLY) ---
        // Push the image update to the launcher immediately so the user sees the new widget UI instantly
        AppWidgetManager.getInstance(appContext)
            .updateAppWidget(widgetId, remoteWidgetView);
        
        long tFirstUpdate = System.currentTimeMillis();
        android.util.Log.d("WIDGET_NATIVE", "[PROFILE] Fast Visual Update (IPC Call): " + (tFirstUpdate - tBeforeClickables) + "ms");

        // --- DUAL-PHASE RENDER (PHASE 2: INTERACTIVE DEEP LINKS) ---
        // Lazily compute and add the transparent clickable overlays to make the cells interactive
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
            addClickableAreas(widgetId, remoteWidgetView, widgetWithViews);
        }
        addCollectionViews(widgetId, remoteWidgetView, widgetWithViews);

        long tAfterClickables = System.currentTimeMillis();
        android.util.Log.d("WIDGET_NATIVE", "[PROFILE] addClickableAreas (RemoteViews setup): " + (tAfterClickables - tFirstUpdate) + "ms");

        AppWidgetManager.getInstance(appContext)
            .updateAppWidget(widgetId, remoteWidgetView);

        long tEnd = System.currentTimeMillis();
        android.util.Log.d("WIDGET_NATIVE", "[PROFILE] Interactive Update (IPC Call): " + (tEnd - tAfterClickables) + "ms");
        android.util.Log.d("WIDGET_NATIVE", "[NATIVE] drawWidgetById END. Native Render Time: " + (tEnd - tStart) + "ms");`;

const p1bSuccess = patchFile(
    rnWidgetPath,
    [oldDrawWidgetClickableSectionOriginal, oldDrawWidgetClickableSectionWithLogs],
    newDrawWidgetClickableSection,
    "Dual-Phase Rendering (Visuals First, Clickables Second) in RNWidget.java"
);

// 1c. Light theme JNI clone removal in RNWidget.java
// Variant A: Original clean package code (without debug profiling logs)
const oldLightCloneOriginal = `        ReadableMap configClone = Arguments.makeNativeMap(light.toHashMap());
        RemoteViews remoteWidgetView = new RemoteViews(appContext.getPackageName(), R.layout.rn_widget);

        WidgetWithViews widgetWithViews = WidgetFactory.buildWidgetFromRoot(
            appContext,
            configClone,
            RNWidgetUtil.getWidgetWidth(appContext, widgetId),
            RNWidgetUtil.getWidgetHeight(appContext, widgetId)
        );`;

// Variant B: Local workspace code (with debug profiling logs)
const oldLightCloneWithLogs = `        ReadableMap configClone = Arguments.makeNativeMap(light.toHashMap());
        RemoteViews remoteWidgetView = new RemoteViews(appContext.getPackageName(), R.layout.rn_widget);

        long tAfterInit = System.currentTimeMillis();
        android.util.Log.d("WIDGET_NATIVE", "[PROFILE] Init/MapClone: " + (tAfterInit - tStart) + "ms");

        WidgetWithViews widgetWithViews = WidgetFactory.buildWidgetFromRoot(
            appContext,
            configClone,
            RNWidgetUtil.getWidgetWidth(appContext, widgetId),
            RNWidgetUtil.getWidgetHeight(appContext, widgetId)
        );`;

const newLightClone = `        RemoteViews remoteWidgetView = new RemoteViews(appContext.getPackageName(), R.layout.rn_widget);

        long tAfterInit = System.currentTimeMillis();
        android.util.Log.d("WIDGET_NATIVE", "[PROFILE] Init/MapClone: " + (tAfterInit - tStart) + "ms");

        WidgetWithViews widgetWithViews = WidgetFactory.buildWidgetFromRoot(
            appContext,
            light,
            RNWidgetUtil.getWidgetWidth(appContext, widgetId),
            RNWidgetUtil.getWidgetHeight(appContext, widgetId)
        );`;

const p1cSuccess = patchFile(
    rnWidgetPath,
    [oldLightCloneOriginal, oldLightCloneWithLogs],
    newLightClone,
    "Light theme duplicate MapClone removal in RNWidget.java"
);

// 1d. Dark theme JNI clone removal in RNWidget.java
const oldDarkClone = `            WidgetWithViews darkWidgetWithViews = WidgetFactory.buildWidgetFromRoot(
                appContext,
                Arguments.makeNativeMap(dark.toHashMap()),
                RNWidgetUtil.getWidgetWidth(appContext, widgetId),
                RNWidgetUtil.getWidgetHeight(appContext, widgetId)
            );`;

const newDarkClone = `            WidgetWithViews darkWidgetWithViews = WidgetFactory.buildWidgetFromRoot(
                appContext,
                dark,
                RNWidgetUtil.getWidgetWidth(appContext, widgetId),
                RNWidgetUtil.getWidgetHeight(appContext, widgetId)
            );`;

const p1dSuccess = patchFile(
    rnWidgetPath,
    oldDarkClone,
    newDarkClone,
    "Dark theme duplicate MapClone removal in RNWidget.java"
);

// 1e. Preview JNI clone removal in RNWidget.java
const oldPreviewClone = `    public WritableMap createPreview(int width, int height) throws Exception {
        ReadableMap configClone = Arguments.makeNativeMap(config.toHashMap());

        WidgetWithViews widgetWithViews = WidgetFactory.buildWidgetFromRoot(appContext, configClone, width, height);`;

const newPreviewClone = `    public WritableMap createPreview(int width, int height) throws Exception {
        WidgetWithViews widgetWithViews = WidgetFactory.buildWidgetFromRoot(appContext, config, width, height);`;

const p1eSuccess = patchFile(
    rnWidgetPath,
    oldPreviewClone,
    newPreviewClone,
    "Preview duplicate MapClone removal in RNWidget.java"
);

// 2. Patch WidgetFactory.java (Supports both clean package and our previous unswapped patch)
const widgetFactoryPath = 'node_modules/react-native-android-widget/android/src/main/java/com/reactnativeandroidwidget/builder/WidgetFactory.java';

// Target Variant A: Original clean package with configClone
const oldBuildWidgetFromRootOriginal = `    public static WidgetWithViews buildWidgetFromRoot(ReactApplicationContext context, ReadableMap config, int width, int height) throws Exception {
        WidgetFactory widgetFactory = new WidgetFactory();

        ReadableMap configClone = Arguments.makeNativeMap(config.toHashMap());

        ReadableMap rootConfig = widgetFactory.getRootConfig(config, width, height);

        if (configClone.hasKey("props") && configClone.getMap("props").hasKey("accessibilityLabel")) {
            widgetFactory.rootAccessibilityLabel = configClone.getMap("props").getString("accessibilityLabel");
        }

        View view = widgetFactory.buildWidget(context, rootConfig, "0");

        for (int i = 0; i < widgetFactory.collectionViews.size(); i++) {
            widgetFactory.collectionViews.get(i).buildChildren(context);
        }

        ResourceUtils.clear();

        Collections.sort(widgetFactory.clickableViews);
        return new WidgetWithViews(view, widgetFactory.clickableViews, widgetFactory.collectionViews, widgetFactory.rootAccessibilityLabel);
    }`;

// Target Variant B: Previous unswapped version which caused JNI consumed map crash
const oldBuildWidgetFromRootUnswapped = `    public static WidgetWithViews buildWidgetFromRoot(ReactApplicationContext context, ReadableMap config, int width, int height) throws Exception {
        WidgetFactory widgetFactory = new WidgetFactory();

        ReadableMap rootConfig = widgetFactory.getRootConfig(config, width, height);

        if (config.hasKey("props") && config.getMap("props").hasKey("accessibilityLabel")) {
            widgetFactory.rootAccessibilityLabel = config.getMap("props").getString("accessibilityLabel");
        }

        View view = widgetFactory.buildWidget(context, rootConfig, "0");

        for (int i = 0; i < widgetFactory.collectionViews.size(); i++) {
            widgetFactory.collectionViews.get(i).buildChildren(context);
        }

        ResourceUtils.clear();

        Collections.sort(widgetFactory.clickableViews);
        return new WidgetWithViews(view, widgetFactory.clickableViews, widgetFactory.collectionViews, widgetFactory.rootAccessibilityLabel);
    }`;

const newBuildWidgetFromRoot = `    public static WidgetWithViews buildWidgetFromRoot(ReactApplicationContext context, ReadableMap config, int width, int height) throws Exception {
        WidgetFactory widgetFactory = new WidgetFactory();

        if (config.hasKey("props") && config.getMap("props").hasKey("accessibilityLabel")) {
            widgetFactory.rootAccessibilityLabel = config.getMap("props").getString("accessibilityLabel");
        }

        ReadableMap rootConfig = widgetFactory.getRootConfig(config, width, height);

        View view = widgetFactory.buildWidget(context, rootConfig, "0");

        for (int i = 0; i < widgetFactory.collectionViews.size(); i++) {
            widgetFactory.collectionViews.get(i).buildChildren(context);
        }

        ResourceUtils.clear();

        Collections.sort(widgetFactory.clickableViews);
        return new WidgetWithViews(view, widgetFactory.clickableViews, widgetFactory.collectionViews, widgetFactory.rootAccessibilityLabel);
    }`;

const p2Success = patchFile(
    widgetFactoryPath,
    [oldBuildWidgetFromRootOriginal, oldBuildWidgetFromRootUnswapped],
    newBuildWidgetFromRoot,
    "buildWidgetFromRoot to remove duplicate MapClone (JNI Consumed-Safe)"
);

// 1f. Clickable Area padding calculation patch (Fix for Foldable Devices)
const oldClickablePadding = `        clickableRemoteView.setViewPadding(
            R.id.rn_widget_clickable_positioner,
            offsetViewBounds.left,
            offsetViewBounds.top,
            RNWidgetUtil.dpToPx(appContext, RNWidgetUtil.getWidgetWidth(appContext, widgetId)) - offsetViewBounds.right,
            0
        );`;

const newClickablePadding = `        clickableRemoteView.setViewPadding(
            R.id.rn_widget_clickable_positioner,
            offsetViewBounds.left,
            offsetViewBounds.top,
            rootWidget.getMeasuredWidth() - offsetViewBounds.right,
            0
        );`;

const p1fSuccess = patchFile(
    rnWidgetPath,
    oldClickablePadding,
    newClickablePadding,
    "Fix Foldable widget click issue by using rootWidget.getMeasuredWidth() instead of getWidgetWidth()"
);

// 1g. Collection View padding calculation patch (Fix for Foldable Devices)
const oldCollectionPadding = `        collectionRemoteView.setViewPadding(
            R.id.rn_widget_list_positioner,
            offsetViewBounds.left,
            offsetViewBounds.top,
            RNWidgetUtil.dpToPx(appContext, RNWidgetUtil.getWidgetWidth(appContext, widgetId)) - offsetViewBounds.right,
            RNWidgetUtil.dpToPx(appContext, RNWidgetUtil.getWidgetHeight(appContext, widgetId)) - offsetViewBounds.bottom
        );`;

const newCollectionPadding = `        collectionRemoteView.setViewPadding(
            R.id.rn_widget_list_positioner,
            offsetViewBounds.left,
            offsetViewBounds.top,
            rootView.getMeasuredWidth() - offsetViewBounds.right,
            rootView.getMeasuredHeight() - offsetViewBounds.bottom
        );`;

const p1gSuccess = patchFile(
    rnWidgetPath,
    oldCollectionPadding,
    newCollectionPadding,
    "Fix Foldable widget list height/width by using rootView.getMeasuredWidth() & Height()"
);

if (p1Success && p1aSuccess && p1bSuccess && p1cSuccess && p1dSuccess && p1eSuccess && p1fSuccess && p1gSuccess && p2Success) {
    console.log("\n>>> ALL RN-ANDROID-WIDGET PATCHES APPLIED SUCCESSFULLY! <<<");
} else {
    console.error("\n>>> SOME RN-ANDROID-WIDGET PATCHES FAILED! PLEASE CHECK ERRORS ABOVE. <<<");
    process.exit(1);
}
