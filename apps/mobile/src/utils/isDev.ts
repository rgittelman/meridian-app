/** True in React Native dev builds and in non-production Node scripts. */
export function isDevEnvironment(): boolean {
  if (typeof __DEV__ !== 'undefined') return __DEV__;
  return process.env.NODE_ENV !== 'production';
}
