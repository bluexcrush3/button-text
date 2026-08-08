import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.buttontext.app',
  appName: 'ボタン操作文字列生成',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  }
};

export default config;
