package com.japasiddhi

import android.media.AudioAttributes
import android.media.SoundPool
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

/**
 * Low-latency chant click using Android SoundPool (not MediaPlayer).
 * Loads res/raw/beep_sound once, then plays instantly on each tap.
 */
class ChantBeepModule(
  private val reactContext: ReactApplicationContext,
) : ReactContextBaseJavaModule(reactContext) {

  private var soundPool: SoundPool? = null
  private var soundId: Int = 0
  private var loaded: Boolean = false
  private var playWhenReady: Boolean = false

  override fun getName(): String = "ChantBeep"

  private fun ensureLoaded() {
    if (soundPool != null && soundId != 0) {
      return
    }
    try {
      val attrs =
        AudioAttributes.Builder()
          .setUsage(AudioAttributes.USAGE_ASSISTANCE_SONIFICATION)
          .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
          .build()
      val pool =
        SoundPool.Builder()
          .setMaxStreams(4)
          .setAudioAttributes(attrs)
          .build()
      pool.setOnLoadCompleteListener { _, sampleId, status ->
        if (status == 0 && sampleId == soundId) {
          loaded = true
          if (playWhenReady) {
            playWhenReady = false
            try {
              pool.play(soundId, 1f, 1f, 1, 0, 1f)
            } catch (_: Exception) {
              // ignore
            }
          }
        }
      }
      soundId = pool.load(reactContext, R.raw.beep_sound, 1)
      soundPool = pool
    } catch (_: Exception) {
      loaded = false
      soundId = 0
      soundPool = null
    }
  }

  @ReactMethod
  fun preload() {
    ensureLoaded()
  }

  @ReactMethod
  fun play() {
    try {
      ensureLoaded()
      val pool = soundPool ?: return
      if (soundId == 0) {
        return
      }
      if (!loaded) {
        // First tap before decode finishes — play as soon as ready.
        playWhenReady = true
        return
      }
      // Fire-and-forget; overlapping taps OK (maxStreams=4).
      pool.play(soundId, 1f, 1f, 1, 0, 1f)
    } catch (_: Exception) {
      // Never crash the JS bridge.
    }
  }

  @ReactMethod
  fun release() {
    try {
      soundPool?.release()
    } catch (_: Exception) {
      // ignore
    }
    soundPool = null
    soundId = 0
    loaded = false
  }

  override fun invalidate() {
    release()
    super.invalidate()
  }
}
