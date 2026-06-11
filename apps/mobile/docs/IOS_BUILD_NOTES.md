# iOS Build Notes

## ExpoModulesJSI CodeSign Failure (Dropbox + SPM)

### Symptom

`xcodebuild` fails during the CocoaPods build phase with:

```
Command CodeSign failed with a nonzero exit code
...
resource fork, Finder information, or similar detritus not allowed
```

The failing target is `ExpoModulesJSI.framework` inside
`node_modules/expo-modules-jsi/apple/.DerivedData/`.

### Root Cause

`node_modules` lives inside a Dropbox-synced folder. Dropbox attaches extended
attributes (`com.apple.quarantine`, resource-fork metadata) to files it syncs.
When the inner SPM `xcodebuild` builds the xcframework slices and writes them
into `.DerivedData/Build/Products/`, Dropbox immediately re-attaches attributes
to those files. The outer Xcode build then tries to codesign the framework and
fails because `codesign` refuses to sign any binary that has resource-fork or
Finder metadata.

### Temporary Workaround (node_modules patch — does NOT persist after reinstall)

Patched `node_modules/expo-modules-jsi/apple/scripts/build-xcframework.sh`:

1. Added `CODE_SIGNING_ALLOWED=NO` to the inner SPM `xcodebuild` call inside
   `build_slice()` so the inner build never tries to sign.

2. Added `xattr -cr "${BUILD_PRODUCTS_PATH}" 2>/dev/null || true` immediately
   after the inner build completes, stripping Dropbox attributes from the
   freshly built products before they are packaged into the xcframework.

3. Added `xattr -cr "${XCFRAMEWORK_PATH}" 2>/dev/null || true` near the end of
   the script (after `write_xcframework_plist`) to strip any attributes Dropbox
   re-attached to the final xcframework.

**This patch lives entirely in `node_modules` and is not tracked by git. It will
be lost the next time `npm install` or `yarn install` is run.**

### Steps to Re-apply After Reinstall

```bash
# Edit the script
open node_modules/expo-modules-jsi/apple/scripts/build-xcframework.sh
```

In `build_slice()`, add to the `xcodebuild` invocation:
```bash
    CODE_SIGNING_ALLOWED=NO \
```

Immediately after the closing `)` of the `env -i ... xcodebuild ...` block, add:
```bash
  xattr -cr "${BUILD_PRODUCTS_PATH}" 2>/dev/null || true
```

Near the end of the script, just before the final `log "Built xcframework..."` line, add:
```bash
xattr -cr "${XCFRAMEWORK_PATH}" 2>/dev/null || true
```

Then clear SPM DerivedData and rebuild:
```bash
rm -rf node_modules/expo-modules-jsi/apple/.DerivedData
```

### Longer-Term Fixes

| Option | Notes |
|--------|-------|
| Move project out of Dropbox | Eliminates the problem entirely. Dropbox and large `node_modules` trees don't mix well. |
| Add a `postinstall` script | Run `xattr -cr node_modules/expo-modules-jsi/apple` after every install. Doesn't fix the re-attach-during-build window, but reduces it. |
| Exclude `node_modules` from Dropbox sync | In Dropbox preferences → Selective Sync, exclude the `node_modules` folder. Requires the folder to still exist locally (it will). |
| Official upstream fix | File an issue with the expo-modules team asking them to add `CODE_SIGNING_ALLOWED=NO` to the xcframework build script by default. |

### Build Commands That Work Around the pod install UTF-8 Bug

`expo run:ios` re-runs `pod install` without `LANG=en_US.UTF-8`, which causes a
Ruby 4.0.5 UTF-8 normalization crash. Use these commands instead:

```bash
# From apps/mobile/ios/
LANG=en_US.UTF-8 pod install --repo-update

# Then build directly (skip expo's pod install step):
xcodebuild \
  -workspace ios/Meridian.xcworkspace \
  -scheme Meridian \
  -configuration Debug \
  -sdk iphonesimulator \
  -destination 'platform=iOS Simulator,id=C014F39A-B2A0-4B1B-BD9B-53BCC5E4EB05' \
  -quiet \
  build

# Install + launch:
xcrun simctl install C014F39A-B2A0-4B1B-BD9B-53BCC5E4EB05 \
  ~/Library/Developer/Xcode/DerivedData/Meridian-*/Build/Products/Debug-iphonesimulator/Meridian.app
xcrun simctl launch C014F39A-B2A0-4B1B-BD9B-53BCC5E4EB05 com.meridian.app
```

Simulator UDID: `C014F39A-B2A0-4B1B-BD9B-53BCC5E4EB05` (iPhone 17, iOS 26.5)
