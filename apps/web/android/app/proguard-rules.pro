# Project specific R8 rules. `app/build.gradle` sets `minifyEnabled true` on
# the release build type, so everything in this file is live rather than
# aspirational.
#
# What is NOT here, because it is already supplied elsewhere and duplicating it
# would only make it look optional:
#
#   * The Capacitor bridge. `@capacitor/android` ships
#     `consumerProguardFiles 'proguard-rules.pro'`, and those rules keep every
#     class annotated `@CapacitorPlugin`, every `@PluginMethod`, the permission
#     and activity callbacks, and the Cordova compatibility classes. Those are
#     the members R8 cannot see being called, because the caller is JavaScript
#     going through reflection rather than Java.
#
#   * MainActivity and the FileProvider. The Android Gradle plugin writes keep
#     rules for anything named in AndroidManifest.xml.

# Readable stack traces from a shrunk build.
#
# This product has no crash reporting wired at all, which
# `docs/MOBILE_READINESS.md` section 5 states plainly, so the only trace anyone
# will ever see is the one Play Console captures from a real device. Without
# these two lines that trace is obfuscated class names and no line numbers, and
# the mapping file needed to read it lives in a build output nobody kept. The
# first line preserves the numbers. The second still strips the original file
# names, so the shrinking is not undone, it is only made legible.
-keepattributes SourceFile,LineNumberTable
-renamesourcefileattribute SourceFile

# The two attributes the WebView bridge and the JSON layer depend on.
#
# Capacitor moves every call between JavaScript and Java as JSON, and it reads
# annotations at runtime to decide what a plugin exposes. Stripping
# `RuntimeVisibleAnnotations` leaves the plugin classes present but invisible to
# the bridge, which fails as a plugin that simply never answers rather than as
# anything that looks like a missing class. `Signature` keeps generic types
# intact for the same reflection.
-keepattributes *Annotation*,Signature,InnerClasses,EnclosingMethod

# Anything the WebView calls directly.
#
# There is no `@JavascriptInterface` in this application's own code today: the
# native capabilities go through Capacitor plugins rather than through a raw
# interface. This rule is here so that if one is ever added it is already
# protected, because the symptom of losing it is a method that is simply not
# there when JavaScript asks for it, with no error on the Java side at all.
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}
