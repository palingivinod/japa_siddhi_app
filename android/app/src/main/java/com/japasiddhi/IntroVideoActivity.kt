package com.japasiddhi

import android.app.Activity
import android.graphics.Color
import android.net.Uri
import android.os.Bundle
import android.view.Gravity
import android.view.ViewGroup
import android.widget.FrameLayout
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

    // Center the video vertically and horizontally on a black background.
    // WRAP_CONTENT keeps the video's own aspect ratio, sized to fit the screen.
    val root = FrameLayout(this).apply { setBackgroundColor(Color.BLACK) }
    val videoView = VideoView(this)
    root.addView(
      videoView,
      FrameLayout.LayoutParams(
        ViewGroup.LayoutParams.WRAP_CONTENT,
        ViewGroup.LayoutParams.WRAP_CONTENT,
        Gravity.CENTER,
      ),
    )
    setContentView(root)

    val controller = MediaController(this)
    // Anchor to the full-screen root so the controls stay at the bottom of the screen.
    controller.setAnchorView(root)
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
