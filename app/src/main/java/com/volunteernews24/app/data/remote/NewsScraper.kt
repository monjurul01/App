package com.volunteernews24.app.data.remote

import com.volunteernews24.app.data.model.Article
import com.volunteernews24.app.data.model.Category
import com.volunteernews24.app.data.model.Ebook
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.jsoup.Jsoup
import org.jsoup.nodes.Document
import org.jsoup.nodes.Element

/**
 * Web scraper using Jsoup to fetch news articles, categories, and ebooks
 * from https://www.volunteernews24.com
 */
object NewsScraper {

    private const val BASE_URL = "https://www.volunteernews24.com"
    private const val USER_AGENT = "Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36"
    private const val TIMEOUT_MS = 15000

    /**
     * Fetches the homepage and extracts featured + latest articles.
     */
    suspend fun fetchHomeArticles(page: Int = 1): List<Article> = withContext(Dispatchers.IO) {
        val articles = mutableListOf<Article>()
        try {
            val url = if (page > 1) "$BASE_URL/page/$page" else BASE_URL
            val doc = fetchDocument(url)

            // Extract featured carousel articles
            doc.select(".mg-blog-post.lg.back-img").forEach { element ->
                parseCarouselArticle(element)?.let { articles.add(it) }
            }

            // Extract latest news articles from the main content area
            doc.select(".mg-blog-post-box .mg-blog-post-2, .mg-blog-post-box article").forEach { element ->
                parseListArticle(element)?.let { articles.add(it) }
            }

            // Extract from widget/sidebar latest posts
            doc.select(".mg-posts-sec .mg-blog-post-3").forEach { element ->
                parseWidgetArticle(element)?.let { articles.add(it) }
            }

            // Extract from general post listings
            doc.select(".mg-blog-post-box .row .col-md-6, .mg-blog-post-box .row .col-md-4").forEach { element ->
                parseGridArticle(element)?.let { articles.add(it) }
            }

        } catch (e: Exception) {
            e.printStackTrace()
        }
        articles.distinctBy { it.url }
    }

    /**
     * Fetches articles for a specific category.
     */
    suspend fun fetchCategoryArticles(categoryUrl: String, page: Int = 1): List<Article> = withContext(Dispatchers.IO) {
        val articles = mutableListOf<Article>()
        try {
            val url = if (page > 1) "$categoryUrl/page/$page" else categoryUrl
            val doc = fetchDocument(url)

            // Category pages typically list articles in a grid/list format
            doc.select(".mg-blog-post-3, .mg-blog-post-2").forEach { element ->
                parseGenericArticle(element)?.let { articles.add(it) }
            }

            // Also parse any article cards in the main content
            doc.select("article, .mg-blog-post").forEach { element ->
                parseGenericArticle(element)?.let { articles.add(it) }
            }
        } catch (e: Exception) {
            e.printStackTrace()
        }
        articles.distinctBy { it.url }
    }

    /**
     * Fetches the full content of a specific article.
     */
    suspend fun fetchArticleDetail(articleUrl: String): Article? = withContext(Dispatchers.IO) {
        try {
            val doc = fetchDocument(articleUrl)

            val title = doc.select("h1.title.single a, h1.title.single, .entry-title")
                .firstOrNull()?.text()?.trim() ?: ""

            val imageUrl = doc.select(".mg-blog-post-box .img-fluid.wp-post-image, .wp-post-image")
                .firstOrNull()?.absUrl("src") ?: ""

            val categories = doc.select(".mg-blog-category .newsup-categories")
                .joinToString(", ") { it.text().trim() }

            val date = doc.select(".mg-blog-date").firstOrNull()?.text()
                ?.replace(Regex("[^\\w\\s,]"), "")?.trim() ?: ""

            val author = doc.select(".mg-author a, .mg-blog-meta .author a")
                .firstOrNull()?.text()?.trim() ?: ""

            // Get article body content - the main article text
            val contentElement = doc.select("article.small.single").firstOrNull()
            val contentHtml = contentElement?.let { el ->
                // Remove print/PDF buttons and scripts
                el.select(".pmb-print-this-page, script, .post-share, .clearfix").remove()
                el.html()
            } ?: ""

            val contentText = contentElement?.let { el ->
                el.select("p").joinToString("\n\n") { it.text().trim() }
            } ?: ""

            Article(
                url = articleUrl,
                title = title,
                excerpt = contentText.take(200),
                content = contentText,
                imageUrl = imageUrl,
                category = categories,
                date = date,
                author = author
            )
        } catch (e: Exception) {
            e.printStackTrace()
            null
        }
    }

    /**
     * Fetches all categories from the navigation menu.
     */
    suspend fun fetchCategories(): List<Category> = withContext(Dispatchers.IO) {
        val categories = mutableListOf<Category>()
        try {
            val doc = fetchDocument(BASE_URL)
            val menuItems = doc.select("#menu-main > li.menu-item")

            menuItems.forEach { menuItem ->
                val link = menuItem.selectFirst("> a.nav-link, > a.dropdown-item") ?: return@forEach
                val name = link.attr("title").ifEmpty { link.text() }.trim()
                val href = link.absUrl("href")

                // Skip home button and generic links
                if (name.isBlank() || href == BASE_URL || href == "#" || href.isBlank()) return@forEach

                val subcategories = menuItem.select("ul.dropdown-menu > li > a").map { subLink ->
                    Category(
                        name = subLink.attr("title").ifEmpty { subLink.text() }.trim(),
                        slug = subLink.absUrl("href").substringAfterLast("/"),
                        url = subLink.absUrl("href")
                    )
                }

                categories.add(
                    Category(
                        name = name,
                        slug = href.substringAfterLast("/"),
                        url = href,
                        subcategories = subcategories
                    )
                )
            }
        } catch (e: Exception) {
            e.printStackTrace()
        }
        categories
    }

    /**
     * Fetches ebooks from the Smart Green Library page.
     */
    suspend fun fetchEbooks(): List<Ebook> = withContext(Dispatchers.IO) {
        val ebooks = mutableListOf<Ebook>()
        try {
            val doc = fetchDocument("$BASE_URL/ebook")

            // Each ebook is in an Elementor column with an image + read button
            doc.select(".elementor-section .elementor-column").forEach { column ->
                val image = column.selectFirst(".elementor-widget-image img")
                val readButton = column.selectFirst(".elementor-button-link")

                if (image != null && readButton != null) {
                    val coverUrl = image.absUrl("src")
                    val pdfUrl = readButton.absUrl("href")
                    val title = image.attr("title").ifEmpty {
                        image.attr("alt").ifEmpty { "Untitled Book" }
                    }

                    if (pdfUrl.isNotBlank()) {
                        ebooks.add(
                            Ebook(
                                pdfUrl = pdfUrl,
                                title = title,
                                coverImageUrl = coverUrl
                            )
                        )
                    }
                }
            }
        } catch (e: Exception) {
            e.printStackTrace()
        }
        ebooks
    }

    // ─── Private Parsing Helpers ────────────────────────────────────

    private fun parseCarouselArticle(element: Element): Article? {
        val linkElement = element.selectFirst("a.link-div") ?: return null
        val url = linkElement.absUrl("href").takeIf { it.isNotBlank() } ?: return null
        val title = element.select("h4.title a").text().trim().takeIf { it.isNotBlank() } ?: return null

        val imageUrl = element.attr("style").let { style ->
            Regex("url\\(['\"]?(.*?)['\"]?\\)").find(style)?.groupValues?.get(1) ?: ""
        }
        val category = element.select(".mg-blog-category .newsup-categories")
            .joinToString(", ") { it.text().trim() }
        val date = element.select(".mg-blog-date").text()
            .replace(Regex("[^\\w\\s,]"), "").trim()

        return Article(
            url = url, title = title, imageUrl = imageUrl,
            category = category, date = date
        )
    }

    private fun parseListArticle(element: Element): Article? {
        val linkElement = element.selectFirst("a[href*=archives]") ?: return null
        val url = linkElement.absUrl("href").takeIf { it.isNotBlank() } ?: return null
        val title = element.select("h4.title a, h3.title a, h2.title a, .entry-title a")
            .text().trim().takeIf { it.isNotBlank() } ?: return null

        val imageUrl = element.select("img").firstOrNull()?.absUrl("src")
            ?: extractBackgroundImage(element)
        val category = element.select(".newsup-categories").joinToString(", ") { it.text().trim() }
        val date = element.select(".mg-blog-date").text().replace(Regex("[^\\w\\s,]"), "").trim()
        val excerpt = element.select("p").text().trim().take(200)

        return Article(
            url = url, title = title, excerpt = excerpt,
            imageUrl = imageUrl ?: "", category = category, date = date
        )
    }

    private fun parseWidgetArticle(element: Element): Article? {
        val linkElement = element.selectFirst("a[href*=archives], h4.title a") ?: return null
        val url = linkElement.absUrl("href").takeIf { it.isNotBlank() } ?: return null
        val title = element.select("h4.title a").text().trim().takeIf { it.isNotBlank() } ?: return null

        val imageUrl = extractBackgroundImage(element) ?: element.select("img").firstOrNull()?.absUrl("src") ?: ""
        val date = element.select(".mg-blog-date").text().replace(Regex("[^\\w\\s,]"), "").trim()

        return Article(url = url, title = title, imageUrl = imageUrl, date = date)
    }

    private fun parseGridArticle(element: Element): Article? {
        val titleLink = element.selectFirst("h4.title a, h3.title a, a[href*=archives]") ?: return null
        val url = titleLink.absUrl("href").takeIf { it.isNotBlank() } ?: return null
        val title = titleLink.text().trim().takeIf { it.isNotBlank() } ?: return null

        val postDiv = element.selectFirst(".mg-blog-post-3, .mg-blog-post-2, .mg-blog-post")
        val imageUrl = postDiv?.let { extractBackgroundImage(it) }
            ?: element.select("img").firstOrNull()?.absUrl("src") ?: ""
        val date = element.select(".mg-blog-date").text().replace(Regex("[^\\w\\s,]"), "").trim()
        val category = element.select(".newsup-categories").joinToString(", ") { it.text().trim() }

        return Article(
            url = url, title = title, imageUrl = imageUrl,
            category = category, date = date
        )
    }

    private fun parseGenericArticle(element: Element): Article? {
        val titleLink = element.selectFirst("h4.title a, h3.title a, h2.title a, .entry-title a, a[href*=archives]") ?: return null
        val url = titleLink.absUrl("href").takeIf { it.isNotBlank() } ?: return null
        val title = titleLink.text().trim().takeIf { it.isNotBlank() } ?: return null

        val imageUrl = extractBackgroundImage(element)
            ?: element.select("img").firstOrNull()?.absUrl("src") ?: ""
        val date = element.select(".mg-blog-date, .entry-date").text()
            .replace(Regex("[^\\w\\s,]"), "").trim()
        val category = element.select(".newsup-categories").joinToString(", ") { it.text().trim() }
        val excerpt = element.select("p, .entry-summary").text().trim().take(200)

        return Article(
            url = url, title = title, excerpt = excerpt,
            imageUrl = imageUrl, category = category, date = date
        )
    }

    private fun extractBackgroundImage(element: Element): String? {
        val style = element.attr("style")
        return Regex("url\\(['\"]?(.*?)['\"]?\\)").find(style)?.groupValues?.get(1)
    }

    private fun fetchDocument(url: String): Document {
        return Jsoup.connect(url)
            .userAgent(USER_AGENT)
            .timeout(TIMEOUT_MS)
            .followRedirects(true)
            .get()
    }
}
