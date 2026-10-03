# ❤️ Mahi AI Assistant — Real-Time Voice Companion & Smart Mobile OS Controller

**Mahi AI** is a real-time, low-latency, voice-to-voice AI companion and smart mobile device controller powered by the **Gemini Live API** (`gemini-3.1-flash-live-preview`). Designed for natural Hindi/Hinglish and English conversations, Mahi combines expressive 3D avatar rendering, speaker biometric voice authentication, long-term memory continuity, and native-style mobile hardware controls inside an installable Progressive Web App (PWA).

---

## ✨ Key Features

### 🎙️ 1. Real-Time Voice-to-Voice Pipeline (`Gemini Live API`)
- **Strict Audio-to-Audio Streaming**: Captures 16 kHz PCM16 microphone audio and streams 24 kHz PCM16 voice responses over WebSockets (`/live-ws`) with zero-latency Web Audio API playback.
- **Debounced Transcript & Immediate Flush**: Optimizes live performance by debouncing streaming transcript updates, flushing immediately when Mahi begins speaking, and executing a safety flush on session end.
- **Screen-Off & Wake Lock Support**: Keeps voice calls active even when the phone screen is locked or running in the background.

### 🌸 2. 3D Anime Girl & Cosmic Visualizers
- **Interactive 3D Avatar (`AnimeAvatar3D`)**: Features real-time audio-reactive lip-sync, natural blinking, headpat/kiss/wink/magic/hot interactions, and a 3D hologram projection mode.
- **Multiple Personas & Outfits**:
  - **Mahi (Photo Style) ✨**: Signature wavy chocolate hair, gold heart pendant, and playful wink pose.
  - **Hot Siren Mahi 🔥**: Sultry crimson-velvet evening style, ruby glossy lips, fiery heart aura, and passionate Hindi romance persona (`hot-siren`).
  - **Mahi Neko 🐱**, **Luna Usagi 🐰**, **Aria Tenshi 👼**, **Hana Blossom 🌸**, and **English Teacher 📚**.
- **Cosmic Orb Mode**: Futuristic multi-ring frequency waveform visualizer.

### 🔐 3. Voice Authentication — Multi-Sample Biometric Security
- **Multi-Sample Speaker Embeddings**: Extracts MFCC-like spectral, pitch/harmonic, zero-crossing, and energy-contour embeddings across multiple enrolled voice samples instead of relying on a single voice profile.
- **Individual Sample Management**: Stores each enrollment sample separately with RMS/quality metrics and allows safely re-recording or replacing individual samples.
- **3-State Verification System**:
  - `verified_admin`: Speaker matches enrolled voice profile above threshold.
  - `not_verified`: Speaker acoustic signature does not match enrolled samples.
  - `insufficient_evidence`: Automatically rejects silence, background noise, or clipped/short audio via RMS and speech-quality detection.
- **Turn-Bound Anti-Replay Protection**: Binds voice verification to the active conversation turn (`turnId`) so old recordings cannot be replayed to authorize sensitive tools.
- **Fail-Closed Tool Security & PIN/Pattern Fallback**: High-risk mobile actions (Phone Calls, WhatsApp, SMS) require `verified_admin` authorization or **PIN / 3x3 Pattern App Lock** fallback when configured. Unattended background execution is restricted for high-risk actions.

### 📱 4. Smart Mobile Control Center
- **Hardware & OS Controls**:
  - **Flashlight / Torch**: Controls the rear camera LED torch via `MediaStreamTrack` constraints with an automatic high-brightness **Screen Torch** fallback.
  - **Haptic Vibration Deck**: Triggers custom vibration patterns (**Heartbeat 💓**, **Kiss 💋**, **Pulse ✨**, **SOS 🆘**).
  - **Live Device Telemetry**: Real-time battery percentage, charging status, network quality, and device model detection synced with Mahi.
- **Direct Call, WhatsApp & SMS**: Launch phone calls (`tel:`), pre-filled WhatsApp messages (`wa.me`), and SMS (`sms:`) via UI or Hindi voice commands.
- **1-Tap App Launcher**: Deep-links into YouTube, WhatsApp, Instagram, Spotify, Google Maps, and Google Search.

### ♿ 5. Accessibility Service Detection
- Combines Android Accessibility Manager heuristics, system settings checks, and focus-settled verification to eliminate race conditions right after enabling Accessibility Services.

### 🧠 6. Conversation Context & Long-Term Memory
- **Short-Term vs. Long-Term Separation**: Preserves long-term user facts and preferences across sessions while keeping short-term turn buffers separate.
- **Safe Clear Chat**: Clearing chat transcripts only resets short-term turn history without erasing long-term memories.
- **Seamless Reconnect & Persona Continuity**: Prevents duplicate/stale memory entries and suppresses repetitive self-introductions when switching personas or reconnecting healthy live sessions.

### 📲 7. Progressive Web App (PWA) & WebAPK Support
- **Installable Standalone App**: Configured with `vite-plugin-pwa`, Web App Manifest (`display: 'standalone'`), home-screen shortcuts (**Voice Call**, **Mobile OS**, **Voice Auth**), and compliant 192px, 512px, maskable, and iOS `apple-touch-icon.png` assets.
- **Offline Asset Caching**: Service worker precaches static assets and fonts with an automatic **In-App Install Banner** and **Offline Mode** indicator.

---

## 🚀 Getting Started

### Prerequisites
- **Node.js** 18+
- A **Gemini API Key** (`GEMINI_API_KEY`)

### Installation & Development

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Configure environment variables**:
   Copy `.env.example` to `.env` and set your Gemini API key:
   ```env
   GEMINI_API_KEY=your_gemini_api_key_here
   ```

3. **Start the full-stack development server (Port 3000)**:
   ```bash
   npm run dev
   ```

4. **Production Build**:
   ```bash
   npm run build
   npm start
   ```

---

## 🗣️ Example Hindi Voice Commands
- *"Mahi, aaj thodi hot aur romantic baatein karo na 🔥"*
- *"Mahi, mere phone ki flashlight on kar do 🔦"*
- *"Mahi, mere phone ki battery kitni hai?"*
- *"Mahi, phone ko heartbeat style mein vibrate karo 💓"*
- *"Mahi, koi pyari si romantic shayari sunao na ❤️"*
- *"Mahi, YouTube open karo"*
