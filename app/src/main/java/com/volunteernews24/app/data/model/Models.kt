package com.volunteernews24.app.data.model

import androidx.room.Entity
import androidx.room.PrimaryKey

/**
 * Represents a news article scraped from volunteernews24.com.
 * Serves as both the domain model and Room entity for offline caching.
 */
@Entity(tableName = "articles")
data class Article(
    @PrimaryKey
    val url: String,
    val title: String,
    val excerpt: String = "",
    val content: String = "",
    val imageUrl: String = "",
    val category: String = "",
    val date: String = "",
    val author: String = "",
    val isBookmarked: Boolean = false,
    val fetchedAt: Long = System.currentTimeMillis()
)

/**
 * Represents a news category from the site navigation.
 */
data class Category(
    val name: String,
    val slug: String,
    val url: String,
    val subcategories: List<Category> = emptyList()
)

/**
 * Represents an ebook/document in the Smart Green Library.
 */
@Entity(tableName = "ebooks")
data class Ebook(
    @PrimaryKey
    val pdfUrl: String,
    val title: String,
    val coverImageUrl: String = "",
    val fetchedAt: Long = System.currentTimeMillis()
)
