package com.japasiddhi

import android.content.ClipData
import android.content.Intent
import androidx.core.content.FileProvider
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import java.io.File
import java.io.FileOutputStream

class AppShareModule(
  private val reactContext: ReactApplicationContext,
) : ReactContextBaseJavaModule(reactContext) {

  override fun getName(): String = "AppShare"

  @ReactMethod
  fun shareLogo(message: String, promise: Promise) {
    try {
      val cacheDir = File(reactContext.cacheDir, "share")
      if (!cacheDir.exists()) {
        cacheDir.mkdirs()
      }
      val logo = File(cacheDir, "japa-siddhi-logo.png")
      reactContext.resources.openRawResource(R.raw.share_logo).use { input ->
        FileOutputStream(logo).use { output -> input.copyTo(output) }
      }
      val uri =
        FileProvider.getUriForFile(
          reactContext,
          "${reactContext.packageName}.fileprovider",
          logo,
        )
      val send =
        Intent(Intent.ACTION_SEND).apply {
          type = "image/png"
          putExtra(Intent.EXTRA_STREAM, uri)
          putExtra(Intent.EXTRA_TEXT, message)
          putExtra(Intent.EXTRA_SUBJECT, "Japa Siddhi")
          clipData = ClipData.newUri(reactContext.contentResolver, "Japa Siddhi", uri)
          addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
        }
      val chooser = Intent.createChooser(send, "Share app")
      chooser.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
      val activity = reactContext.currentActivity
      if (activity != null) {
        activity.startActivity(chooser)
      } else {
        chooser.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        reactContext.startActivity(chooser)
      }
      promise.resolve(true)
    } catch (error: Exception) {
      promise.reject("SHARE_FAILED", error.message, error)
    }
  }
}
