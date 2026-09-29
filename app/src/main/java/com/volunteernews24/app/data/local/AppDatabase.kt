package com.volunteernews24.app.data.local

import android.content.Context
import androidx.room.*
import com.volunteernews24.app.data.model.Article
import com.volunteernews24.app.data.model.Ebook
import kotlinx.coroutines.flow.Flow

@Dao
interface ArticleDao {

    @Query("SELECT * FROM articles ORDER BY fetchedAt DESC")
    fun getAllArticles(): Flow<List<Article>>

    @Query("SELECT * FROM articles WHERE isBookmarked = 1 ORDER BY fetchedAt DESC")
    fun getBookmarkedArticles(): Flow<List<Article>>

    @Query("SELECT * FROM articles WHERE category LIKE '%' || :category || '%' ORDER BY fetchedAt DESC")
    fun getArticlesByCategory(category: String): Flow<List<Article>>

    @Query("SELECT * FROM articles WHERE url = :url LIMIT 1")
    suspend fun getArticleByUrl(url: String): Article?

    @Query("SELECT * FROM articles WHERE title LIKE '%' || :query || '%' OR excerpt LIKE '%' || :query || '%' ORDER BY fetchedAt DESC")
    fun searchArticles(query: String): Flow<List<Article>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertArticles(articles: List<Article>)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertArticle(article: Article)

    @Update
    suspend fun updateArticle(article: Article)

    @Query("UPDATE articles SET isBookmarked = :bookmarked WHERE url = :url")
    suspend fun setBookmark(url: String, bookmarked: Boolean)

    @Query("DELETE FROM articles WHERE isBookmarked = 0 AND fetchedAt < :olderThan")
    suspend fun deleteOldArticles(olderThan: Long)

    @Query("SELECT COUNT(*) FROM articles")
    suspend fun getArticleCount(): Int
}

@Dao
interface EbookDao {

    @Query("SELECT * FROM ebooks ORDER BY fetchedAt DESC")
    fun getAllEbooks(): Flow<List<Ebook>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertEbooks(ebooks: List<Ebook>)
}

@Database(
    entities = [Article::class, Ebook::class],
    version = 1,
    exportSchema = false
)
abstract class AppDatabase : RoomDatabase() {

    abstract fun articleDao(): ArticleDao
    abstract fun ebookDao(): EbookDao

    companion object {
        @Volatile
        private var INSTANCE: AppDatabase? = null

        fun getInstance(context: Context): AppDatabase {
            return INSTANCE ?: synchronized(this) {
                val instance = Room.databaseBuilder(
                    context.applicationContext,
                    AppDatabase::class.java,
                    "volunteernews24_db"
                )
                    .fallbackToDestructiveMigration()
                    .build()
                INSTANCE = instance
                instance
            }
        }
    }
}
