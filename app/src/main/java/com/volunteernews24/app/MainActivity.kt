package com.volunteernews24.app

import android.content.Intent
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.activity.viewModels
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.ui.Modifier
import androidx.core.splashscreen.SplashScreen.Companion.installSplashScreen
import androidx.navigation.compose.rememberNavController
import com.volunteernews24.app.ui.navigation.VNNavGraph
import com.volunteernews24.app.ui.theme.VolunteerNews24Theme
import com.volunteernews24.app.ui.viewmodel.NewsViewModel
import java.net.URLDecoder
import java.nio.charset.StandardCharsets

class MainActivity : ComponentActivity() {

    private val viewModel: NewsViewModel by viewModels()

    override fun onCreate(savedInstanceState: Bundle?) {
        // Install splash screen before super.onCreate
        installSplashScreen()
        enableEdgeToEdge()
        super.onCreate(savedInstanceState)
        
        setContent {
            VolunteerNews24Theme {
                Surface(
                    modifier = Modifier.fillMaxSize(),
                    color = MaterialTheme.colorScheme.background
                ) {
                    val navController = rememberNavController()
                    
                    // Handle FCM intents
                    LaunchedEffect(intent) {
                        handleIntent(intent, navController)
                    }

                    VNNavGraph(
                        navController = navController,
                        viewModel = viewModel
                    )
                }
            }
        }
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        // Note: we can't directly access navController here, but we could use a flow
        // or shared state in ViewModel if we need to navigate on new intents while running
    }

    private fun handleIntent(intent: Intent?, navController: androidx.navigation.NavController) {
        val articleUrl = intent?.getStringExtra("article_url")
        if (articleUrl != null) {
            val encodedUrl = java.net.URLEncoder.encode(articleUrl, StandardCharsets.UTF_8.toString())
            navController.navigate("article_detail/$encodedUrl")
        }
    }
}
