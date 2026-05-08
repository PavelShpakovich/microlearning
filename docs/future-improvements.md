# Future Improvements

## Mobile Upgrade Follow-up

The Expo mobile app is already upgraded to Expo SDK 55, so the old `expo-localization@15.0.3` iOS patch is no longer needed.

Remaining follow-up work is regression-oriented rather than upgrade-blocking:

- Run full device validation for notifications, secure store, downloads, and purchases on iOS and Android.
- Verify EAS builds for both platforms from the regenerated native projects.
- Revisit the temporary local compatibility wrappers under `apps/mobile/src/lib/` if upstream typings improve in future package releases.
