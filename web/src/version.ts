/**
 * The version the app is running, stamped in at build time from package.json.
 * Shown in Settings so it can be compared with what is on GitHub.
 */
declare const __APP_VERSION__: string | undefined;

export const APP_VERSION: string =
  typeof __APP_VERSION__ === 'string' ? __APP_VERSION__ : 'dev';
