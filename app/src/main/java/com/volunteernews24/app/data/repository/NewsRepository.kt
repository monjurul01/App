package com.volunteernews24.app.data.repository

import com.volunteernews24.app.data.local.ArticleDao
import com.volunteernews24.app.data.local.EbookDao
import com.volunteernews24.app.data.model.Article
import com.volunteernews24.app.data.model.Category
import com.volunteernews24.app.data.model.Ebook
import com.volunteernews24.app.data.remote.NewsScraper
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.first

/**
 * Repository that coordinates between remote scraping and local Room cache.
 * Implements an offline-first strategy: loads from cache, then refreshes from network.
 */
class NewsRepository(
    private val articleDao: ArticleDao,
    private val ebookDao: EbookDao
) {

    // ─── Articles ───────────────────────────────────────────────────

    fun getCachedArticles(): Flow<List<Article>> = articleDao.getAllArticles()

    fun getBookmarkedArticles(): Flow<List<Article>> = articleDao.getBookmarkedArticles()

    fun getArticlesByCategory(category: String): Flow<List<Article>> =
        articleDao.getArticlesByCategory(category)

    fun searchArticles(query: String): Flow<List<Article>> = articleDao.searchArticles(query)

    /**
     * Fetches fresh articles from the web, merges with existing bookmarks,
     * and saves to the local cache.
     */
    suspend fun refreshHomeArticles(page: Int = 1): List<Article> {
        val remoteArticles = NewsScraper.fetchHomeArticles(page)
        if (remoteArticles.isNotEmpty()) {
            // Preserve bookmark state for existing articles
            val articlesToInsert = remoteArticles.map { remote ->
                val existing = articleDao.getArticleByUrl(remote.url)
                remote.copy(isBookmarked = existing?.isBookmarked ?: false)
            }
            articleDao.insertArticles(articlesToInsert)
        }
        return remoteArticles
    }

    /**
     * Fetches articles for a specific category from the web.
     */
    suspend fun refreshCategoryArticles(categoryUrl: String, page: Int = 1): List<Article> {
        val remoteArticles = NewsScraper.fetchCategoryArticles(categoryUrl, page)
        if (remoteArticles.isNotEmpty()) {
            val articlesToInsert = remoteArticles.map { remote ->
                val existing = articleDao.getArticleByUrl(remote.url)
                remote.copy(isBookmarked = existing?.isBookmarked ?: false)
            }
            articleDao.insertArticles(articlesToInsert)
        }
        return remoteArticles
    }

    /**
     * Fetches the full detail of a single article.
     */
    suspend fun getArticleDetail(url: String): Article? {
        // Check cache first
        val cached = articleDao.getArticleByUrl(url)
        if (cached != null && cached.content.isNotBlank()) {
            return cached
        }

        // Fetch from network
        val detail = NewsScraper.fetchArticleDetail(url)
        if (detail != null) {
            val merged = detail.copy(
                isBookmarked = cached?.isBookmarked ?: false
            )
            articleDao.insertArticle(merged)
            return merged
        }
        return cached
    }

    /**
     * Toggles the bookmark state for an article.
     */
    suspend fun toggleBookmark(url: String): Boolean {
        val article = articleDao.getArticleByUrl(url)
        val newState = !(article?.isBookmarked ?: false)
        articleDao.setBookmark(url, newState)
        return newState
    }

    // ─── Categories ─────────────────────────────────────────────────

    suspend fun fetchCategories(): List<Category> = NewsScraper.fetchCategories()

    // ─── Ebooks (Smart Green Library) ───────────────────────────────

    fun getCachedEbooks(): Flow<List<Ebook>> = ebookDao.getAllEbooks()

    suspend fun refreshEbooks(): List<Ebook> {
        val remoteEbooks = NewsScraper.fetchEbooks()
        if (remoteEbooks.isNotEmpty()) {
            ebookDao.insertEbooks(remoteEbooks)
        }
        return remoteEbooks
    }

    // ─── Maintenance ────────────────────────────────────────────────

    /**
     * Cleans up old non-bookmarked articles (older than 7 days).
     */
    suspend fun cleanOldCache() {
        val sevenDaysAgo = System.currentTimeMillis() - (7 * 24 * 60 * 60 * 1000L)
        articleDao.deleteOldArticles(sevenDaysAgo)
    }
}
