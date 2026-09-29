# Add project specific ProGuard rules here.
-keepattributes SourceFile,LineNumberTable
-keep public class * extends java.lang.Exception

# Jsoup
-keeppackagenames org.jsoup.nodes

# Room
-keep class * extends androidx.room.RoomDatabase
-keep @androidx.room.Entity class *
-dontwarn androidx.room.paging.**

# Firebase
-keep class com.google.firebase.** { *; }

# Coil
-keep class coil.** { *; }
