# 🍎 Beatrice on macOS: Setup Guide (no coding needed)

## 1. Check your Mac

Beatrice needs a Mac with **Apple Silicon** (M1, M2, M3 or M4). To check, open the **Apple menu → About This Mac** and look at **Chip**. If it says **Intel**, Beatrice can't run on that Mac, because the voice engine is only available for Apple Silicon.

## 2. Download and install

1. Download **`Beatrice.Voice.Changer-2.1.1-arm64.dmg`** (or newer) from the [latest release](https://github.com/satiricalguru/Beatrice-voicechanger-mac/releases/latest).
2. Double-click the DMG and drag **Beatrice Voice Changer** onto **Applications**.
3. Open it from Applications. If macOS says it can't verify the app, click **Done**, then go to **System Settings → Privacy & Security**, scroll to **Security**, and click **Open Anyway**. You only do this once.
4. Click **Allow** when Beatrice asks to use your microphone.

There's nothing else to install. Python and the audio packages are built into the app. The bottom left of the window should say **Backend connected** within a few seconds.

## 3. Use it

1. **Input Microphone:** the mic you speak into. **Output Device:** your headphones. Use headphones, not speakers, to avoid feedback.
2. Pick a voice from the grid.
3. Click the power button so **BYPASSED** changes to **LIVE**, and start talking.
4. Optional: adjust **Pitch Shift** and **Formant Shift**. Keep **Noise Gate** at `0.000` for the smoothest sound.

### Discord / Zoom / OBS

Install [BlackHole 2ch](https://existential.audio/blackhole/). In Beatrice, set **Output Device** to `BlackHole 2ch`. In Discord, Zoom or OBS, set the microphone to `BlackHole 2ch`. Turn on **Hear Yourself** and choose your headphones if you also want to listen.

## Still stuck?

- **Still on "Waiting for backend…" or "Connecting…"?** Make sure you're on **v2.1.1 or newer**. Older versions needed Terminal commands; you don't anymore. Quit with **⌘ Q** and reopen.
- **macOS says Beatrice "is damaged and can't be opened"?** That was a bug in v2.1.0. Delete it and download **v2.1.1 or newer**, which opens normally with **Open Anyway**.
- **Beatrice says "The voice engine stopped unexpectedly"?** Click **Copy Details**, then [open an issue](https://github.com/satiricalguru/Beatrice-voicechanger-mac/issues) and paste them in.

🎬 The [setup video](Beatrice-Mac-Setup-Guide.mp4) was made for v2.0.2. The download, install and "using it" parts still apply, but you can skip its Terminal section on v2.1.0.
