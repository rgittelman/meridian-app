# Add project specific ProGuard rules here.
# By default, the flags in this file are appended to flags specified
# in /usr/local/Cellar/android-sdk/24.3.3/tools/proguard/proguard-android.txt
# You can edit the include path and order by changing the proguardFiles
# directive in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# react-native-reanimated
-keep class com.swmansion.reanimated.** { *; }
-keep class com.facebook.react.turbomodule.** { *; }

# Expo Kotlin module types — loaded via reflection at runtime.
# -dontoptimize is required because R8's constructor parameter removal strips
# the KClass argument from ReturnType.<init> and other Expo reflection constructors,
# causing NoSuchMethodError at runtime even when -keep rules are present.
-keep class expo.modules.** { *; }
-dontoptimize

# Add any project specific keep options here:
