import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.example.uniride',
  appName: 'UniRide',
  webDir: 'www',
  server: {
    androidScheme: 'https'
  }
};

export default config;
