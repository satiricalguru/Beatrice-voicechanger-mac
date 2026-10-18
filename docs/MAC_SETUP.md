# 🍎 Beatrice on macOS: Setup Guide (no coding needed)

🎬 **Video walkthrough (6 min):** [Beatrice-Mac-Setup-Guide.mp4](Beatrice-Mac-Setup-Guide.mp4). It covers downloading, installing, the one-time setup, and using the app.

## Stuck on "Waiting for backend…" or "Connecting…"?

If those messages never go away, the voice engine couldn't start. Beatrice's voice engine is a small Python program running behind the window. It needs Python plus three free audio packages, and those aren't included in the download yet. You only have to set them up once.

## 1. Download

Open the [latest release](https://github.com/satiricalguru/Beatrice-voicechanger-mac/releases/latest) and download the DMG for your Mac. To check your chip, go to  **Apple menu → About This Mac → Chip**.

| Your Mac | File |
|---|---|
| Apple chip (M1 / M2 / M3 / M4) | `…-arm64.dmg` |
| Intel chip | `….dmg` (no `arm64`) |

## 2. Install

1. Double-click the DMG and drag **Beatrice Voice Changer** onto **Applications**.
2. Open it from Applications. If macOS says it can't verify the app, click **Done**. Then go to **System Settings → Privacy & Security**, scroll to **Security**, and click **Open Anyway**.

## 3. One-time setup (fixes "Waiting for backend…")

Open **Terminal**: press **⌘ Command + Space**, type `Terminal`, and press Return. Then paste these commands one at a time.

**Command 1** installs Apple's free developer tools, which include Python. Click **Install** in the pop-up and wait for it to finish (5–15 min). If Terminal says they're already installed, that's fine.

```bash
xcode-select --install
```

**Command 2** installs the audio packages. Wait for `Successfully installed`:

```bash
python3 -m pip install --user sounddevice numpy soundfile
```

Now **quit Beatrice completely with ⌘ Command + Q** (closing the window isn't enough) and open it again. Click **Allow** when it asks to use the microphone. The bottom left should now say **Backend connected**.

**Still says "Connecting…"?** Run this too, then reopen the app:

```bash
xattr -cr "/Applications/Beatrice Voice Changer.app"
```

## 4. Use it

1. **Input Microphone:** the mic you speak into. **Output Device:** your headphones. Use headphones, not speakers, to avoid feedback.
2. Pick a voice from the grid.
3. Click the power button so **BYPASSED** changes to **LIVE**, and start talking.
4. Optional: adjust **Pitch Shift** and **Formant Shift**. Keep **Noise Gate** at `0.000` for the smoothest sound.

### Discord / Zoom / OBS

Install [BlackHole 2ch](https://existential.audio/blackhole/). In Beatrice, set **Output Device** to `BlackHole 2ch`. In Discord, Zoom or OBS, set the microphone to `BlackHole 2ch`. Turn on **Hear Yourself** and choose your headphones if you also want to listen.

## Still stuck?

[Open an issue](https://github.com/satiricalguru/Beatrice-voicechanger-mac/issues) with a screenshot of your Terminal window after running Command 2.
