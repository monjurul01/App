package com.volunteernews24.app.ui.navigation

import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Book
import androidx.compose.material.icons.filled.Bookmark
import androidx.compose.material.icons.filled.Category
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.outlined.Book
import androidx.compose.material.icons.outlined.BookmarkBorder
import androidx.compose.material.icons.outlined.Category
import androidx.compose.material.icons.outlined.Home
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.res.stringResource
import androidx.navigation.NavController
import androidx.navigation.NavHostController
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.navArgument
import com.volunteernews24.app.R
import com.volunteernews24.app.ui.screens.*
import com.volunteernews24.app.ui.theme.VNRed
import com.volunteernews24.app.ui.viewmodel.NewsViewModel
import java.net.URLDecoder
import java.net.URLEncoder
import java.nio.charset.StandardCharsets

sealed class Screen(
    val route: String,
    val titleResId: Int,
    val iconSelected: ImageVector,
    val iconUnselected: ImageVector
) {
    object Home : Screen("home", R.string.home, Icons.Filled.Home, Icons.Outlined.Home)
    object Categories : Screen("categories", R.string.categories, Icons.Filled.Category, Icons.Outlined.Category)
    object Bookmarks : Screen("bookmarks", R.string.bookmarks, Icons.Filled.Bookmark, Icons.Outlined.BookmarkBorder)
    object Library : Screen("library", R.string.library, Icons.Filled.Book, Icons.Outlined.Book)
}

val bottomNavScreens = listOf(
    Screen.Home,
    Screen.Categories,
    Screen.Bookmarks,
    Screen.Library
)

@Composable
fun VNNavGraph(
    navController: NavHostController,
    viewModel: NewsViewModel
) {
    val uiState by viewModel.uiState.collectAsState()

    // Show Snackbar for bookmark updates
    val snackbarHostState = androidx.compose.runtime.remember { SnackbarHostState() }
    
    androidx.compose.runtime.LaunchedEffect(uiState.bookmarkMessage) {
        uiState.bookmarkMessage?.let { message ->
            snackbarHostState.showSnackbar(message, duration = SnackbarDuration.Short)
            viewModel.clearBookmarkMessage()
        }
    }

    Scaffold(
        snackbarHost = { SnackbarHost(snackbarHostState) },
        bottomBar = {
            val navBackStackEntry by navController.currentBackStackEntryAsState()
            val currentRoute = navBackStackEntry?.destination?.route
            
            // Only show bottom bar on top-level destinations
            if (bottomNavScreens.any { it.route == currentRoute }) {
                NavigationBar(
                    containerColor = MaterialTheme.colorScheme.surfaceContainer,
                    contentColor = MaterialTheme.colorScheme.onSurface
                ) {
                    bottomNavScreens.forEach { screen ->
                        val selected = currentRoute == screen.route
                        NavigationBarItem(
                            icon = {
                                Icon(
                                    if (selected) screen.iconSelected else screen.iconUnselected,
                                    contentDescription = stringResource(screen.titleResId)
                                )
                            },
                            label = { Text(stringResource(screen.titleResId)) },
                            selected = selected,
                            onClick = {
                                navController.navigate(screen.route) {
                                    popUpTo(navController.graph.startDestinationId) {
                                        saveState = true
                                    }
                                    launchSingleTop = true
                                    restoreState = true
                                }
                            },
                            colors = NavigationBarItemDefaults.colors(
                                selectedIconColor = VNRed,
                                selectedTextColor = VNRed,
                                indicatorColor = VNRed.copy(alpha = 0.1f)
                            )
                        )
                    }
                }
            }
        }
    ) { paddingValues ->
        NavHost(
            navController = navController,
            startDestination = Screen.Home.route,
            modifier = Modifier.padding(paddingValues)
        ) {
            composable(Screen.Home.route) {
                HomeScreen(
                    isLoading = uiState.isLoading,
                    isOffline = uiState.isOffline,
                    articles = uiState.articles,
                    onRefresh = { viewModel.refreshArticles() },
                    onArticleClick = { article ->
                        val encodedUrl = URLEncoder.encode(article.url, StandardCharsets.UTF_8.toString())
                        navController.navigate("article_detail/$encodedUrl")
                    },
                    onBookmarkClick = { url -> viewModel.toggleBookmark(url) }
                )
            }
            
            composable(Screen.Categories.route) {
                CategoriesListScreen(
                    categories = uiState.categories,
                    onCategoryClick = { category ->
                        val encodedUrl = URLEncoder.encode(category.url, StandardCharsets.UTF_8.toString())
                        val encodedName = URLEncoder.encode(category.name, StandardCharsets.UTF_8.toString())
                        navController.navigate("category/$encodedName/$encodedUrl")
                    }
                )
            }
            
            composable(Screen.Bookmarks.route) {
                BookmarkScreen(
                    bookmarkedArticles = uiState.bookmarkedArticles,
                    onArticleClick = { article ->
                        val encodedUrl = URLEncoder.encode(article.url, StandardCharsets.UTF_8.toString())
                        navController.navigate("article_detail/$encodedUrl")
                    },
                    onBookmarkClick = { url -> viewModel.toggleBookmark(url) }
                )
            }
            
            composable(Screen.Library.route) {
                LibraryScreen(
                    ebooks = uiState.ebooks,
                    isLoading = uiState.isLoading,
                    onLoadEbooks = { viewModel.loadEbooks() }
                )
            }
            
            composable(
                route = "category/{name}/{url}",
                arguments = listOf(
                    navArgument("name") { type = NavType.StringType },
                    navArgument("url") { type = NavType.StringType }
                )
            ) { backStackEntry ->
                val encodedName = backStackEntry.arguments?.getString("name") ?: ""
                val encodedUrl = backStackEntry.arguments?.getString("url") ?: ""
                val name = URLDecoder.decode(encodedName, StandardCharsets.UTF_8.toString())
                val url = URLDecoder.decode(encodedUrl, StandardCharsets.UTF_8.toString())
                
                CategoryScreen(
                    categoryName = name,
                    categoryUrl = url,
                    articles = uiState.categoryArticles,
                    isLoading = uiState.isLoading,
                    onLoadCategory = { viewModel.loadCategoryArticles(it) },
                    onArticleClick = { article ->
                        val articleEncodedUrl = URLEncoder.encode(article.url, StandardCharsets.UTF_8.toString())
                        navController.navigate("article_detail/$articleEncodedUrl")
                    },
                    onBookmarkClick = { articleUrl -> viewModel.toggleBookmark(articleUrl) },
                    onBackClick = { navController.popBackStack() }
                )
            }
            
            composable(
                route = "article_detail/{url}",
                arguments = listOf(
                    navArgument("url") { type = NavType.StringType }
                )
            ) { backStackEntry ->
                val encodedUrl = backStackEntry.arguments?.getString("url") ?: ""
                val url = URLDecoder.decode(encodedUrl, StandardCharsets.UTF_8.toString())
                
                ArticleDetailScreen(
                    articleUrl = url,
                    article = uiState.currentArticle,
                    isLoading = uiState.isArticleLoading,
                    onLoadArticle = { viewModel.loadArticleDetail(it) },
                    onBookmarkClick = { articleUrl -> viewModel.toggleBookmark(articleUrl) },
                    onBackClick = { navController.popBackStack() }
                )
            }
        }
    }
}
