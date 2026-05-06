# Future Improvements

## Upgrade Expo SDK (51 → 52+)

**Priority**: Medium  
**Blocked by**: Time for regression testing

### Problem

`expo-localization@15.0.3` (max version for SDK 51) has a Swift compilation error on iOS 26+: the `switch` on `Calendar.Identifier` is not exhaustive because Apple added new calendar identifiers. We patched this locally (`patches/expo-localization@15.0.3.patch`), but the proper fix exists in `expo-localization@16+` which requires SDK 52+.

### Solution

Upgrade Expo SDK to 52+ which includes:

- `expo-localization@16+` with native fix (remove patch)
- React Native upgrade (0.74 → 0.76+)
- All native module updates

### Scope

- Update `expo` and all `expo-*` packages
- Update `react-native` and related dependencies
- Re-run `npx expo prebuild --clean`
- Test all native features (notifications, secure store, file system, etc.)
- Verify EAS builds for both iOS and Android
- Remove `patches/expo-localization@15.0.3.patch`
