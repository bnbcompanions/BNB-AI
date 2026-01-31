# Talking Avatar - 3D VRM + Multilingual TTS

A client-side 3D talking avatar that speaks French, English, and Chinese.
Two TTS modes: browser voices (free, instant) or local Piper server (open-source, high quality).

## Quick Start

```bash
npm install
npm run dev
```

Open **http://localhost:5173** in Chrome/Edge.

## Adding an Avatar

The app loads a VRM model from `public/avatars/avatar.vrm`.

1. Get a free VRM file:
   - **VRoid Hub** — https://hub.vroid.com/ (search for free models)
   - **Ready Player Me** — create one at https://readyplayer.me/ (export as GLB, convert to VRM)
   - **VRoid Studio** — free app to create your own VRM

2. Place it at: `public/avatars/avatar.vrm`

3. Restart the dev server — the avatar will appear with idle animation (blink, head sway, breathing) and lip sync.

**Requirements**: The VRM should have blendshapes/expressions — most VRM files include `aa` (mouth open) and `blink` by default.

If no avatar file is present, the app shows a clean instruction overlay.

## TTS Modes

### Mode A: System Voices (default)
- Uses the browser's Web Speech API — zero setup, works offline
- Automatically picks the best voice per language (prefers Neural/Natural/Premium voices)
- If no Chinese voice is installed, shows a warning and falls back to English

### Mode B: Local HQ (Piper TTS)
Optional high-quality TTS via open-source Piper engine.

```bash
# 1. Install Piper binary
#    Download from: https://github.com/rhasspy/piper/releases
#    Place in server/piper/ or add to your PATH

# 2. Download voice models into server/voices/
#    From: https://github.com/rhasspy/piper/blob/master/VOICES.md
#    - en_US-lessac-medium.onnx + .json
#    - fr_FR-siwis-medium.onnx + .json
#    - zh_CN-huayan-medium.onnx + .json

# 3. Start the TTS server
npm run tts:server

# 4. In the app, switch to "Local HQ" mode
```

The local server runs on `http://localhost:3001`. The frontend auto-detects if it's running.

## Project Structure

```
src/
├── App.tsx                # Main layout
├── App.css                # Styles
├── components/
│   ├── AvatarStage.tsx    # Three.js canvas + VRM loader + state overlays
│   └── ControlsPanel.tsx  # UI: language, voice, mode, sliders, buttons
└── lib/
    ├── tts.ts             # Web Speech API + Piper client + voice ranking
    ├── avatar.ts          # VRM avatar controller (Three.js + @pixiv/three-vrm)
    └── lipsync.ts         # Mouth animation (boundary + amplitude modes)
server/
├── index.ts               # Express server for Piper TTS
├── piper/                 # Place piper binary here
└── voices/                # Place .onnx + .json voice models here
```

## Supported Browsers

- Chrome / Edge (best voice selection)
- Firefox (limited system voices)
- Safari (macOS/iOS voices)
