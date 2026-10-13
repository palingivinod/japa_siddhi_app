package com.japasiddhi

import android.media.AudioAttributes
import android.media.AudioManager
import android.media.MediaPlayer
import android.media.SoundPool
import android.os.Build
import android.util.Log
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

/**
 * Chant tap beep. Prefers MediaPlayer (reliable with MP3 in res/raw);
 * falls back to SoundPool when possible.
 */
class ChantBeepModule(
  private val reactContext: ReactApplicationContext,
) : ReactContextBaseJavaModule(reactContext) {

  companion object {
    private const val TAG = "ChantBeep"
  }

  private var mediaPlayer: MediaPlayer? = null
  private var soundPool: SoundPool? = null
  private var poolSoundId: Int = 0
  private var poolLoaded: Boolean = false

  override fun getName(): String = "ChantBeep"

  private fun audioAttributes(): AudioAttributes =
    AudioAttributes.Builder()
      .setUsage(AudioAttributes.USAGE_MEDIA)
      .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
      .build()

  private fun ensureMediaPlayer(): MediaPlayer? {
    val existing = mediaPlayer
    if (existing != null) {
      return existing
    }
    return try {
      val player = MediaPlayer.create(reactContext, R.raw.beep_sound)
      if (player == null) {
        Log.w(TAG, "MediaPlayer.create returned null for R.raw.beep_sound")
        return null
      }
      player.setAudioAttributes(audioAttributes())
      player.setVolume(1f, 1f)
      player.setOnErrorListener { mp, what, extra ->
        Log.w(TAG, "MediaPlayer error what=$what extra=$extra")
        try {
          mp.reset()
        } catch (_: Exception) {
          // ignore
        }
        mediaPlayer = null
        true
      }
      mediaPlayer = player
      player
    } catch (e: Exception) {
      Log.w(TAG, "MediaPlayer init failed", e)
      null
    }
  }

  private fun playMedia(): Boolean {
    val player = ensureMediaPlayer() ?: return false
    return try {
      if (player.isPlaying) {
        player.pause()
      }
      player.seekTo(0)
      player.start()
      true
    } catch (e: Exception) {
      Log.w(TAG, "MediaPlayer play failed, recreating", e)
      try {
        player.release()
      } catch (_: Exception) {
        // ignore
      }
      mediaPlayer = null
      val retry = ensureMediaPlayer() ?: return false
      try {
        retry.start()
        true
      } catch (e2: Exception) {
        Log.w(TAG, "MediaPlayer retry failed", e2)
        false
      }
    }
  }

  private fun ensurePool() {
    if (soundPool != null && poolSoundId != 0) {
      return
    }
    try {
      val pool =
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
          SoundPool.Builder()
            .setMaxStreams(4)
            .setAudioAttributes(audioAttributes())
            .build()
        } else {
          @Suppress("DEPRECATION")
          SoundPool(4, AudioManager.STREAM_MUSIC, 0)
        }
      pool.setOnLoadCompleteListener { _, sampleId, status ->
        if (status == 0 && sampleId == poolSoundId) {
          poolLoaded = true
        } else {
          Log.w(TAG, "SoundPool load status=$status id=$sampleId")
        }
      }
      poolSoundId = pool.load(reactContext, R.raw.beep_sound, 1)
      soundPool = pool
    } catch (e: Exception) {
      Log.w(TAG, "SoundPool init failed", e)
      soundPool = null
      poolSoundId = 0
      poolLoaded = false
    }
  }

  private fun playPool(): Boolean {
    ensurePool()
    val pool = soundPool ?: return false
    if (poolSoundId == 0 || !poolLoaded) {
      return false
    }
    return try {
      val streamId = pool.play(poolSoundId, 1f, 1f, 1, 0, 1f)
      streamId != 0
    } catch (e: Exception) {
      Log.w(TAG, "SoundPool play failed", e)
      false
    }
  }

  @ReactMethod
  fun preload() {
    try {
      ensureMediaPlayer()
      ensurePool()
    } catch (e: Exception) {
      Log.w(TAG, "preload failed", e)
    }
  }

  @ReactMethod
  fun play() {
    try {
      // MediaPlayer first — MP3 in res/raw is reliable here.
      if (playMedia()) {
        return
      }
      playPool()
    } catch (e: Exception) {
      Log.w(TAG, "play failed", e)
    }
  }

  @ReactMethod
  fun release() {
    try {
      mediaPlayer?.release()
    } catch (_: Exception) {
      // ignore
    }
    mediaPlayer = null
    try {
      soundPool?.release()
    } catch (_: Exception) {
      // ignore
    }
    soundPool = null
    poolSoundId = 0
    poolLoaded = false
  }

  override fun invalidate() {
    release()
    super.invalidate()
  }
}
