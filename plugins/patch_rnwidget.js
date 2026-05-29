const fs = require('fs');
const path = require('path');

function patchFile(filePath, targetContents, replacementContent, description) {
    if (!fs.existsSync(filePath)) {
        console.error(`Error: File not found - ${filePath}`);
        return false;
    }

    let content = fs.readFileSync(filePath, 'utf8').replace(/\r\n/g, '\n');
    const normalizedReplacement = replacementContent.replace(/\r\n/g, '\n');

    if (content.includes(normalizedReplacement)) {
        console.log(`[ALREADY PATCHED] ${description} in ${path.basename(filePath)}`);
        return true;
    }

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

if (p1Success && p2Success) {
    console.log("\n>>> ALL RN-ANDROID-WIDGET PATCHES APPLIED SUCCESSFULLY! <<<");
} else {
    console.error("\n>>> SOME RN-ANDROID-WIDGET PATCHES FAILED! PLEASE CHECK ERRORS ABOVE. <<<");
    process.exit(1);
}
