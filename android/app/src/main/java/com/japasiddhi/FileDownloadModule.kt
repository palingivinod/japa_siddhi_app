package com.japasiddhi

import android.content.ContentValues
import android.os.Build
import android.os.Environment
import android.provider.MediaStore
import android.util.Base64
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import java.io.File
import java.io.FileOutputStream

class FileDownloadModule(
  private val reactContext: ReactApplicationContext,
) : ReactContextBaseJavaModule(reactContext) {

  override fun getName(): String = "FileDownload"

  @ReactMethod
  fun saveBase64File(
    fileName: String,
    base64Data: String,
    mimeType: String,
    promise: Promise,
  ) {
    try {
      val cleanBase64 = base64Data.substringAfter(",", base64Data)
      val bytes = Base64.decode(cleanBase64, Base64.DEFAULT)
      val safeName =
        fileName.ifBlank { "download-${System.currentTimeMillis()}.bin" }
      val type =
        mimeType.ifBlank {
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        }

      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
        val values =
          ContentValues().apply {
            put(MediaStore.Downloads.DISPLAY_NAME, safeName)
            put(MediaStore.Downloads.MIME_TYPE, type)
            put(MediaStore.Downloads.IS_PENDING, 1)
          }
        val resolver = reactContext.contentResolver
        val uri =
          resolver.insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, values)
            ?: throw IllegalStateException("Unable to create download entry.")
        resolver.openOutputStream(uri)?.use { output -> output.write(bytes) }
          ?: throw IllegalStateException("Unable to open download stream.")
        values.clear()
        values.put(MediaStore.Downloads.IS_PENDING, 0)
        resolver.update(uri, values, null, null)
        promise.resolve(uri.toString())
        return
      }

      val dir =
        Environment.getExternalStoragePublicDirectory(
          Environment.DIRECTORY_DOWNLOADS,
        )
      if (!dir.exists()) {
        dir.mkdirs()
      }
      val file = File(dir, safeName)
      FileOutputStream(file).use { output -> output.write(bytes) }
      promise.resolve(file.absolutePath)
    } catch (error: Exception) {
      promise.reject("SAVE_FAILED", error.message, error)
    }
  }
}
