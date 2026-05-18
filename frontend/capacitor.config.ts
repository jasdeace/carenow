import type { CapacitorConfig } from '@capacitor/cli';
import { KeyboardResize } from '@capacitor/keyboard';

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
  },
  plugins: {
    Keyboard: {
      // Resize the WebView itself when the keyboard opens so viewport units
      // (and the chat panel) shrink to the visible area instead of being covered.
      resize: KeyboardResize.Native,
    },
  },
};

export default config;
