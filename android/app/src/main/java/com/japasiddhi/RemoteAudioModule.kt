package com.japasiddhi

import android.media.AudioAttributes
import android.media.MediaPlayer
import android.os.Handler
import android.os.Looper
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.WritableNativeMap
import com.facebook.react.modules.core.DeviceEventManagerModule

/**
 * Streaming audio play/pause for Samuhika (WhatsApp-style inline player).
 */
class RemoteAudioModule(
  private val reactContext: ReactApplicationContext,
) : ReactContextBaseJavaModule(reactContext) {

  private var player: MediaPlayer? = null
  private var currentUrl: String? = null
  private val mainHandler = Handler(Looper.getMainLooper())
  private var progressRunnable: Runnable? = null

  override fun getName(): String = "RemoteAudio"

  private fun emit(event: String, payload: WritableNativeMap) {
    if (!reactContext.hasActiveReactInstance()) {
      return
    }
    reactContext
      .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
      .emit(event, payload)
  }

  private fun stopProgress() {
    progressRunnable?.let { mainHandler.removeCallbacks(it) }
    progressRunnable = null
  }

  private fun startProgress() {
    stopProgress()
    val tick =
      object : Runnable {
        override fun run() {
          val p = player ?: return
          try {
            if (p.isPlaying) {
              val map = WritableNativeMap()
              map.putString("url", currentUrl)
              map.putDouble("positionMs", p.currentPosition.toDouble())
              map.putDouble("durationMs", p.duration.toDouble().coerceAtLeast(0.0))
              map.putBoolean("playing", true)
              emit("RemoteAudioProgress", map)
              mainHandler.postDelayed(this, 250)
            }
          } catch (_: Exception) {
            stopProgress()
          }
        }
      }
    progressRunnable = tick
    mainHandler.post(tick)
  }

  private fun releasePlayer() {
    stopProgress()
    try {
      player?.stop()
    } catch (_: Exception) {
    }
    try {
      player?.release()
    } catch (_: Exception) {
    }
    player = null
    currentUrl = null
  }

  @ReactMethod
  fun play(url: String, promise: Promise) {
    if (url.isBlank()) {
      promise.reject("E_URL", "Audio URL is empty")
      return
    }
    try {
      if (currentUrl == url && player != null) {
        val p = player!!
        if (!p.isPlaying) {
          p.start()
          startProgress()
          promise.resolve(true)
          return
        }
        promise.resolve(true)
        return
      }
      releasePlayer()
      currentUrl = url
      var settled = false
      val mp = MediaPlayer()
      player = mp
      mp.setAudioAttributes(
        AudioAttributes.Builder()
          .setUsage(AudioAttributes.USAGE_MEDIA)
          .setContentType(AudioAttributes.CONTENT_TYPE_MUSIC)
          .build(),
      )
      mp.setDataSource(url)
      mp.setOnPreparedListener { prepared ->
        prepared.start()
        startProgress()
        if (!settled) {
          settled = true
          promise.resolve(true)
        }
      }
      mp.setOnCompletionListener {
        stopProgress()
        val map = WritableNativeMap()
        map.putString("url", currentUrl)
        map.putBoolean("playing", false)
        map.putBoolean("completed", true)
        emit("RemoteAudioProgress", map)
      }
      mp.setOnErrorListener { _, what, extra ->
        releasePlayer()
        if (!settled) {
          settled = true
          promise.reject("E_PLAY", "MediaPlayer error what=$what extra=$extra")
        }
        true
      }
      mp.prepareAsync()
    } catch (e: Exception) {
      releasePlayer()
      promise.reject("E_PLAY", e.message, e)
    }
  }

  @ReactMethod
  fun pause(promise: Promise) {
    try {
      val p = player
      if (p != null && p.isPlaying) {
        p.pause()
        stopProgress()
        val map = WritableNativeMap()
        map.putString("url", currentUrl)
        map.putDouble("positionMs", p.currentPosition.toDouble())
        map.putDouble("durationMs", p.duration.toDouble().coerceAtLeast(0.0))
        map.putBoolean("playing", false)
        emit("RemoteAudioProgress", map)
      }
      promise.resolve(true)
    } catch (e: Exception) {
      promise.reject("E_PAUSE", e.message, e)
    }
  }

  @ReactMethod
  fun stop(promise: Promise) {
    try {
      releasePlayer()
      promise.resolve(true)
    } catch (e: Exception) {
      promise.reject("E_STOP", e.message, e)
    }
  }

  @ReactMethod
  fun isPlaying(promise: Promise) {
    try {
      promise.resolve(player?.isPlaying == true)
    } catch (e: Exception) {
      promise.reject("E_STATE", e.message, e)
    }
  }

  @ReactMethod
  fun addListener(eventName: String) {
    // Required for NativeEventEmitter on RN.
  }

  @ReactMethod
  fun removeListeners(count: Int) {
    // Required for NativeEventEmitter on RN.
  }

  override fun invalidate() {
    releasePlayer()
    super.invalidate()
  }
}
