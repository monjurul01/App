package com.volunteernews24.app.ui.theme

import android.app.Activity
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.SideEffect
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.toArgb
import androidx.compose.ui.platform.LocalView
import androidx.compose.ui.text.font.Font
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.core.view.WindowCompat

// ─── Brand Colors ───────────────────────────────────────────────────
val VNRed = Color(0xFFC62828)
val VNRedDark = Color(0xFF8E0000)
val VNRedLight = Color(0xFFFF5F52)
val VNAmber = Color(0xFFFF6F00)
val VNAmberLight = Color(0xFFFFA040)

// ─── Dark Theme Colors ──────────────────────────────────────────────
val DarkSurface = Color(0xFF0D0D0D)
val DarkSurfaceVariant = Color(0xFF1A1A1A)
val DarkCard = Color(0xFF1E1E1E)
val DarkCardElevated = Color(0xFF252525)
val DarkOnSurface = Color(0xFFE8E8E8)
val DarkOnSurfaceVariant = Color(0xFFB0B0B0)
val DarkOutline = Color(0xFF333333)

// ─── Light Theme Colors ─────────────────────────────────────────────
val LightSurface = Color(0xFFF5F5F5)
val LightSurfaceVariant = Color(0xFFEEEEEE)
val LightCard = Color(0xFFFFFFFF)
val LightOnSurface = Color(0xFF1C1B1F)
val LightOnSurfaceVariant = Color(0xFF49454F)

// ─── Color Schemes ──────────────────────────────────────────────────
private val DarkColorScheme = darkColorScheme(
    primary = VNRed,
    onPrimary = Color.White,
    primaryContainer = VNRedDark,
    onPrimaryContainer = Color.White,
    secondary = VNAmber,
    onSecondary = Color.Black,
    secondaryContainer = Color(0xFF3D2800),
    onSecondaryContainer = VNAmberLight,
    tertiary = Color(0xFF4CAF50),
    onTertiary = Color.White,
    background = DarkSurface,
    onBackground = DarkOnSurface,
    surface = DarkSurface,
    onSurface = DarkOnSurface,
    surfaceVariant = DarkSurfaceVariant,
    onSurfaceVariant = DarkOnSurfaceVariant,
    surfaceContainerLowest = Color(0xFF0A0A0A),
    surfaceContainerLow = Color(0xFF141414),
    surfaceContainer = DarkCard,
    surfaceContainerHigh = DarkCardElevated,
    surfaceContainerHighest = Color(0xFF2C2C2C),
    outline = DarkOutline,
    outlineVariant = Color(0xFF2A2A2A),
    error = Color(0xFFCF6679),
    onError = Color.Black,
)

private val LightColorScheme = lightColorScheme(
    primary = VNRed,
    onPrimary = Color.White,
    primaryContainer = Color(0xFFFFDAD6),
    onPrimaryContainer = VNRedDark,
    secondary = VNAmber,
    onSecondary = Color.White,
    background = LightSurface,
    onBackground = LightOnSurface,
    surface = LightSurface,
    onSurface = LightOnSurface,
    surfaceVariant = LightSurfaceVariant,
    onSurfaceVariant = LightOnSurfaceVariant,
    surfaceContainer = LightCard,
    outline = Color(0xFFCCCCCC),
    error = Color(0xFFB3261E),
    onError = Color.White,
)

// ─── Custom Shapes ──────────────────────────────────────────────────
val CardCornerRadius = 16.dp
val BottomBarCornerRadius = 24.dp

@Composable
fun VolunteerNews24Theme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    content: @Composable () -> Unit
) {
    val colorScheme = if (darkTheme) DarkColorScheme else LightColorScheme
    val view = LocalView.current

    if (!view.isInEditMode) {
        SideEffect {
            val window = (view.context as Activity).window
            window.statusBarColor = Color.Transparent.toArgb()
            window.navigationBarColor = Color.Transparent.toArgb()
            WindowCompat.getInsetsController(window, view).apply {
                isAppearanceLightStatusBars = !darkTheme
                isAppearanceLightNavigationBars = !darkTheme
            }
        }
    }

    MaterialTheme(
        colorScheme = colorScheme,
        typography = Typography(),
        content = content
    )
}
