import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.jasdeace.carenow',
  appName: 'CareNow',
  webDir: 'dist',
  backgroundColor: '#ffffff',
  ios: {
    allowsLinkPreview: false,
    scrollEnabled: true,
    backgroundColor: '#ffffff',
  },
  android: {
    allowMixedContent: true,
    backgroundColor: '#ffffff',
  }
};

export default config;
