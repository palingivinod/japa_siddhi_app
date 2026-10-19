package com.japasiddhi

import android.app.Activity
import android.net.Uri
import android.os.Bundle
import android.widget.MediaController
import android.widget.VideoView

/**
 * Full-screen player for intro / Why Japa Siddhi videos (dummy or real URLs).
 */
class IntroVideoActivity : Activity() {
  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    val url = intent?.getStringExtra(EXTRA_URL).orEmpty()
    if (url.isBlank()) {
      finish()
      return
    }

    val videoView = VideoView(this)
    setContentView(videoView)

    val controller = MediaController(this)
    controller.setAnchorView(videoView)
    videoView.setMediaController(controller)
    videoView.setVideoURI(Uri.parse(url))
    videoView.setOnCompletionListener { finish() }
    videoView.setOnErrorListener { _, _, _ ->
      finish()
      true
    }
    videoView.setOnPreparedListener { mp ->
      mp.isLooping = false
      videoView.start()
    }
  }

  companion object {
    const val EXTRA_URL = "intro_video_url"
  }
}
