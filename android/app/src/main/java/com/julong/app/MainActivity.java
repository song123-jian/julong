package com.julong.app;

import android.os.Bundle;
import android.os.Build;
import android.view.View;
import android.view.Window;
import android.view.WindowManager;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        // 先设置状态栏颜色，再调用super
        Window window = getWindow();
        window.clearFlags(WindowManager.LayoutParams.FLAG_TRANSLUCENT_STATUS);
        window.addFlags(WindowManager.LayoutParams.FLAG_DRAWS_SYSTEM_BAR_BACKGROUNDS);
        window.setStatusBarColor(android.graphics.Color.parseColor("#D97706"));
        window.setNavigationBarColor(android.graphics.Color.parseColor("#FFFFFF"));

        // 不使用 LAYOUT_FULLSCREEN，让 WebView 内容从状态栏下方开始
        // 这样 Android 系统自动处理状态栏空间，不需要 CSS safe-area
        super.onCreate(savedInstanceState);
    }
}
