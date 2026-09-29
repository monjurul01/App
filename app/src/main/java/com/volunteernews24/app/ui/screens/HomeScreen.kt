package com.volunteernews24.app.ui.screens

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Search
import androidx.compose.material3.*
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.volunteernews24.app.R
import com.volunteernews24.app.data.model.Article
import com.volunteernews24.app.ui.components.*
import com.volunteernews24.app.ui.theme.VNRed

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun HomeScreen(
    isLoading: Boolean,
    isOffline: Boolean,
    articles: List<Article>,
    onRefresh: () -> Unit,
    onArticleClick: (Article) -> Unit,
    onBookmarkClick: (String) -> Unit,
    modifier: Modifier = Modifier
) {
    var isRefreshing by remember { mutableStateOf(false) }

    LaunchedEffect(isLoading) {
        if (!isLoading) {
            isRefreshing = false
        }
    }

    PullToRefreshBox(
        isRefreshing = isRefreshing,
        onRefresh = {
            isRefreshing = true
            onRefresh()
        },
        modifier = modifier.fillMaxSize()
    ) {

        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(horizontal = 16.dp),
            contentPadding = PaddingValues(top = 16.dp, bottom = 100.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            if (isOffline) {
                item {
                    OfflineBanner()
                }
            }

            if (isLoading && articles.isEmpty()) {
                items(5) {
                    ArticleCardShimmer()
                }
            } else if (articles.isNotEmpty()) {
                val featuredArticle = articles.firstOrNull { it.imageUrl.isNotBlank() }
                val remainingArticles = if (featuredArticle != null) articles.filter { it.url != featuredArticle.url } else articles
                
                if (featuredArticle != null) {
                    item {
                        FeaturedArticleCard(
                            article = featuredArticle,
                            onClick = { onArticleClick(featuredArticle) }
                        )
                    }
                }

                if (remainingArticles.isNotEmpty()) {
                    item {
                        SectionHeader(title = "সর্বশেষ সংবাদ")
                    }

                    // Show a few items in a horizontal scroll for variety
                    if (remainingArticles.size >= 4) {
                        item {
                            LazyRow(
                                horizontalArrangement = Arrangement.spacedBy(12.dp),
                                contentPadding = PaddingValues(vertical = 4.dp)
                            ) {
                                items(remainingArticles.take(4)) { article ->
                                    CompactArticleCard(
                                        article = article,
                                        onClick = { onArticleClick(article) }
                                    )
                                }
                            }
                        }

                        item {
                            Spacer(modifier = Modifier.height(8.dp))
                            SectionHeader(title = "আরও সংবাদ")
                        }
                    }

                    items(if (remainingArticles.size >= 4) remainingArticles.drop(4) else remainingArticles) { article ->
                        ArticleCard(
                            article = article,
                            onClick = { onArticleClick(article) },
                            onBookmarkClick = { onBookmarkClick(article.url) }
                        )
                    }
                }
            } else if (!isLoading) {
                item {
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(300.dp),
                        contentAlignment = Alignment.Center
                    ) {
                        Text(
                            text = stringResource(R.string.no_articles),
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                }
            }
        }
    }
}
