import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.julong.app',
  appName: '聚隆科技',
  webDir: 'dist',
  server: {
    // 开发时可指向 Vite dev server
    // url: 'http://localhost:5173',
    // cleartext: true
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 600,
      launchAutoHide: true,
      backgroundColor: '#1A1A2E',
      showSpinner: false,
      androidScaleType: 'CENTER_CROP',
    },
    StatusBar: {
      style: 'LIGHT',
      backgroundColor: '#1A1A2E',
    },
  },
};

export default config;
