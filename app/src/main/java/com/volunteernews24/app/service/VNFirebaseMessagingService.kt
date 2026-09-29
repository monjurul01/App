package com.volunteernews24.app.service

import android.app.PendingIntent
import android.content.Intent
import android.util.Log
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage
import com.volunteernews24.app.MainActivity
import com.volunteernews24.app.R
import com.volunteernews24.app.VolunteerNewsApp

/**
 * Firebase Cloud Messaging service that handles push notifications
 * for new article publications.
 */
class VNFirebaseMessagingService : FirebaseMessagingService() {

    companion object {
        private const val TAG = "VNFirebaseMsgService"
    }

    override fun onNewToken(token: String) {
        super.onNewToken(token)
        Log.d(TAG, "FCM Token refreshed: $token")
        // In production, send this token to your backend server
        // to enable targeted push notifications
    }

    override fun onMessageReceived(message: RemoteMessage) {
        super.onMessageReceived(message)
        Log.d(TAG, "FCM message received from: ${message.from}")

        // Handle notification payload
        message.notification?.let { notification ->
            sendNotification(
                title = notification.title ?: "VolunteerNews24",
                body = notification.body ?: "নতুন সংবাদ প্রকাশিত হয়েছে",
                articleUrl = message.data["article_url"]
            )
        }

        // Handle data payload (when notification is sent as data-only)
        if (message.data.isNotEmpty()) {
            val title = message.data["title"] ?: message.notification?.title ?: "VolunteerNews24"
            val body = message.data["body"] ?: message.notification?.body ?: "নতুন সংবাদ প্রকাশিত হয়েছে"
            val articleUrl = message.data["article_url"]

            if (message.notification == null) {
                sendNotification(title, body, articleUrl)
            }
        }
    }

    private fun sendNotification(title: String, body: String, articleUrl: String?) {
        val intent = Intent(this, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
            articleUrl?.let { putExtra("article_url", it) }
        }

        val pendingIntent = PendingIntent.getActivity(
            this, 0, intent,
            PendingIntent.FLAG_ONE_SHOT or PendingIntent.FLAG_IMMUTABLE
        )

        val notification = NotificationCompat.Builder(this, VolunteerNewsApp.NOTIFICATION_CHANNEL_ID)
            .setSmallIcon(R.drawable.ic_notification)
            .setContentTitle(title)
            .setContentText(body)
            .setAutoCancel(true)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setContentIntent(pendingIntent)
            .setStyle(NotificationCompat.BigTextStyle().bigText(body))
            .build()

        try {
            NotificationManagerCompat.from(this).notify(
                System.currentTimeMillis().toInt(),
                notification
            )
        } catch (e: SecurityException) {
            Log.w(TAG, "Notification permission not granted", e)
        }
    }
}
