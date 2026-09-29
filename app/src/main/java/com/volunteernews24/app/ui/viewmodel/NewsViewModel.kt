package com.volunteernews24.app.ui.viewmodel

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.volunteernews24.app.VolunteerNewsApp
import com.volunteernews24.app.data.model.Article
import com.volunteernews24.app.data.model.Category
import com.volunteernews24.app.data.model.Ebook
import com.volunteernews24.app.data.repository.NewsRepository
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch

data class UiState(
    val isLoading: Boolean = true,
    val isRefreshing: Boolean = false,
    val error: String? = null,
    val articles: List<Article> = emptyList(),
    val bookmarkedArticles: List<Article> = emptyList(),
    val categoryArticles: List<Article> = emptyList(),
    val searchResults: List<Article> = emptyList(),
    val categories: List<Category> = emptyList(),
    val ebooks: List<Ebook> = emptyList(),
    val currentArticle: Article? = null,
    val isArticleLoading: Boolean = false,
    val isOffline: Boolean = false,
    val bookmarkMessage: String? = null
)

class NewsViewModel(application: Application) : AndroidViewModel(application) {

    private val app = application as VolunteerNewsApp
    private val repository = NewsRepository(
        app.database.articleDao(),
        app.database.ebookDao()
    )

    private val _uiState = MutableStateFlow(UiState())
    val uiState: StateFlow<UiState> = _uiState.asStateFlow()

    init {
        observeCachedArticles()
        observeBookmarks()
        observeEbooks()
        loadHomeArticles()
        loadCategories()
    }

    // ─── Observe Cached Data (Offline-First) ────────────────────────

    private fun observeCachedArticles() {
        viewModelScope.launch {
            repository.getCachedArticles().collect { articles ->
                _uiState.update { it.copy(articles = articles) }
            }
        }
    }

    private fun observeBookmarks() {
        viewModelScope.launch {
            repository.getBookmarkedArticles().collect { bookmarked ->
                _uiState.update { it.copy(bookmarkedArticles = bookmarked) }
            }
        }
    }

    private fun observeEbooks() {
        viewModelScope.launch {
            repository.getCachedEbooks().collect { ebooks ->
                _uiState.update { it.copy(ebooks = ebooks) }
            }
        }
    }

    // ─── Network Fetching ───────────────────────────────────────────

    fun loadHomeArticles() {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, error = null) }
            try {
                repository.refreshHomeArticles()
                _uiState.update { it.copy(isLoading = false, isOffline = false) }
            } catch (e: Exception) {
                _uiState.update {
                    it.copy(
                        isLoading = false,
                        isOffline = true,
                        error = if (it.articles.isEmpty()) e.message else null
                    )
                }
            }
        }
    }

    fun refreshArticles() {
        viewModelScope.launch {
            _uiState.update { it.copy(isRefreshing = true) }
            try {
                repository.refreshHomeArticles()
                _uiState.update { it.copy(isRefreshing = false, isOffline = false, error = null) }
            } catch (e: Exception) {
                _uiState.update { it.copy(isRefreshing = false, isOffline = true) }
            }
        }
    }

    fun loadCategories() {
        viewModelScope.launch {
            try {
                val categories = repository.fetchCategories()
                _uiState.update { it.copy(categories = categories) }
            } catch (e: Exception) {
                // Categories can fail silently; we show a fallback list
            }
        }
    }

    fun loadCategoryArticles(categoryUrl: String) {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, categoryArticles = emptyList()) }
            try {
                val articles = repository.refreshCategoryArticles(categoryUrl)
                _uiState.update { it.copy(isLoading = false, categoryArticles = articles) }
            } catch (e: Exception) {
                _uiState.update { it.copy(isLoading = false, error = e.message) }
            }
        }
    }

    fun loadArticleDetail(url: String) {
        viewModelScope.launch {
            _uiState.update { it.copy(isArticleLoading = true, currentArticle = null) }
            try {
                val article = repository.getArticleDetail(url)
                _uiState.update { it.copy(isArticleLoading = false, currentArticle = article) }
            } catch (e: Exception) {
                _uiState.update { it.copy(isArticleLoading = false, error = e.message) }
            }
        }
    }

    fun loadEbooks() {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true) }
            try {
                repository.refreshEbooks()
                _uiState.update { it.copy(isLoading = false) }
            } catch (e: Exception) {
                _uiState.update { it.copy(isLoading = false) }
            }
        }
    }

    // ─── User Actions ───────────────────────────────────────────────

    fun toggleBookmark(articleUrl: String) {
        viewModelScope.launch {
            val isNowBookmarked = repository.toggleBookmark(articleUrl)
            _uiState.update {
                it.copy(
                    bookmarkMessage = if (isNowBookmarked) "সংবাদ সংরক্ষিত হয়েছে"
                    else "সংবাদ সংরক্ষণ বাতিল হয়েছে"
                )
            }
            // Also refresh current article if we're viewing it
            val current = _uiState.value.currentArticle
            if (current?.url == articleUrl) {
                _uiState.update {
                    it.copy(currentArticle = current.copy(isBookmarked = isNowBookmarked))
                }
            }
        }
    }

    fun clearBookmarkMessage() {
        _uiState.update { it.copy(bookmarkMessage = null) }
    }

    fun searchArticles(query: String) {
        if (query.isBlank()) {
            _uiState.update { it.copy(searchResults = emptyList()) }
            return
        }
        viewModelScope.launch {
            repository.searchArticles(query).collect { results ->
                _uiState.update { it.copy(searchResults = results) }
            }
        }
    }

    fun clearError() {
        _uiState.update { it.copy(error = null) }
    }
}
