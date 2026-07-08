# AuraTone-WASM

### WASM Tone Generator: Step-by-Step Deployment Guide & Repository

---

## **📌 Overview**
This guide provides a **complete, production-ready** setup for a **WASM-based 440Hz tone generator** deployed on **Cloudflare Pages**. The repository includes:
- C code for WASM audio synthesis
- JavaScript for Web Audio API integration
- HTML/CSS for a simple SPA UI
- GitHub Actions workflow for automated WASM compilation
- Cloudflare Pages deployment configuration

---

## **🎯 Features**
✅ **Pure WASM Audio Synthesis** – 440Hz sine wave generated in C, compiled to WASM
✅ **Web Audio API Integration** – Real-time audio playback in the browser
✅ **Zero Dependencies** – No external libraries or frameworks
✅ **Automated CI/CD** – GitHub Actions compiles C to WASM on push
✅ **Cloudflare Pages Optimized** – Correct MIME types, fast CDN delivery

---

## **📂 Repository Structure**
```
wasm-tone-generator/
├── src/
│   ├── tone_generator.c    # C code for WASM tone synthesis
│   ├── app.js              # JS for Web Audio API + WASM bridge
│   └── index.html          # SPA UI
├── wasm/                   # Compiled WASM output (auto-generated)
├── .github/
│   └── workflows/
│       └── compile-wasm.yml # GitHub Actions for WASM compilation
├── README.md               # This file
└── package.json            # Optional: Scripts for local dev
```

---

## **⚙️ Step-by-Step Guide: Deploy to Cloudflare Pages**

---

### **🔹 Step 1: Prerequisites**
1. **GitHub Account** – For hosting the repository and GitHub Actions.
2. **Cloudflare Account** – For deploying the static site.
3. **Local Setup (Optional)** – For testing before deployment:
   - [Node.js](https://nodejs.org/) (for local HTTP server)
   - [Emscripten SDK](https://emscripten.org/docs/getting_started/downloads.html) (for local WASM compilation)

---

### **🔹 Step 2: Create the Repository**
1. **Clone this template** or create a new repository on GitHub.
2. **Add the following files** to your repository:

---

#### **📄 `src/tone_generator.c`**
```c
// SPDX-License-Identifier: MIT
#include <emscripten.h>
#include <math.h>

// Generate a sine wave tone in a float buffer
// buffer: Pointer to pre-allocated float array
// length: Number of samples
// frequency: Frequency of the tone (e.g., 440Hz)
// sampleRate: Audio sample rate (e.g., 44100)
EMSCRIPTEN_KEEPALIVE
void generate_tone(float* buffer, int length, float frequency, float sampleRate) {
  for (int i = 0; i < length; i++) {
    float t = (float)i / sampleRate;
    buffer[i] = sinf(2.0f * M_PI * frequency * t);
  }
}
```

---

#### **📄 `src/app.js`**
```javascript
// WASM Tone Generator - Web Audio API Integration
let audioContext = null;
let isPlaying = false;

// Initialize Audio Context
function initAudioContext() {
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
  }
  return audioContext;
}

// Load WASM Module
let wasmModule = null;
async function loadWASM() {
  if (wasmModule) return wasmModule;
  
  // Use streaming instantiation for better performance
  const response = await fetch('/wasm/tone_generator.wasm');
  const { instance } = await WebAssembly.instantiateStreaming(response);
  wasmModule = instance;
  return wasmModule;
}

// Play a tone using WASM
async function playTone(frequency = 440, duration = 2.0) {
  if (isPlaying) return;
  isPlaying = true;
  
  const ctx = initAudioContext();
  const sampleRate = ctx.sampleRate;
  const length = Math.floor(sampleRate * duration);
  
  // Create AudioBuffer
  const buffer = ctx.createBuffer(1, length, sampleRate);
  const channelData = buffer.getChannelData(0);
  
  // Load WASM module
  const wasm = await loadWASM();
  
  // Allocate memory in WASM
  const bufferPtr = wasm.exports.malloc(length * 4); // 4 bytes per float
  
  // Generate tone in WASM
  wasm.exports.generate_tone(bufferPtr, length, frequency, sampleRate);
  
  // Copy WASM memory to AudioBuffer
  const wasmMemory = new Float32Array(
    wasm.exports.memory.buffer,
    bufferPtr,
    length
  );
  channelData.set(wasmMemory);
  
  // Free WASM memory
  wasm.exports.free(bufferPtr);
  
  // Play the buffer
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.connect(ctx.destination);
  source.start();
  
  source.onended = () => {
    isPlaying = false;
  };
}

// UI Event Listeners
window.addEventListener('DOMContentLoaded', () => {
  document.getElementById('playTone').addEventListener('click', () => {
    playTone(440);
  });
});
```

---

#### **📄 `src/index.html`**
```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>WASM Tone Generator</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
      display: flex;
      justify-content: center;
      align-items: center;
      height: 100vh;
      margin: 0;
      background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%);
      color: white;
    }
    .container {
      text-align: center;
      padding: 2rem;
      background: rgba(255, 255, 255, 0.1);
      border-radius: 12px;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
      backdrop-filter: blur(4px);
    }
    h1 {
      margin: 0 0 1rem;
      font-size: 2.5rem;
    }
    p {
      margin: 0 0 2rem;
      opacity: 0.9;
    }
    button {
      padding: 0.75rem 1.5rem;
      font-size: 1rem;
      background: #00d4ff;
      color: #1e3c72;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.3s ease;
      font-weight: 600;
    }
    button:hover {
      background: #00a8cc;
      transform: translateY(-2px);
    }
    button:active {
      transform: translateY(0);
    }
    .status {
      margin-top: 1rem;
      font-size: 0.9rem;
      opacity: 0.8;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>WASM Tone Generator</h1>
    <p>Play a 440Hz sine wave tone generated in WebAssembly</p>
    <button id="playTone">Play 440Hz Tone</button>
    <p class="status">Click to play (WASM + Web Audio API)</p>
  </div>
  <script src="app.js" type="module"></script>
</body>
</html>
```

---

#### **📄 `.github/workflows/compile-wasm.yml`**
```yaml
name: Compile WASM and Deploy

on:
  push:
    branches: [ main ]

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
      # Checkout repository
      - name: Checkout
        uses: actions/checkout@v4

      # Install Emscripten
      - name: Install Emscripten
        run: |
          git clone https://github.com/emscripten-core/emsdk.git
          cd emsdk
          ./emsdk install latest
          ./emsdk activate latest
          source ./emsdk_env.sh
          echo "::add-path::$(pwd)/emsdk/upstream/emscripten"

      # Compile C to WASM
      - name: Compile WASM
        run: |
          mkdir -p wasm
          emcc src/tone_generator.c -o wasm/tone_generator.wasm \
            -s WASM=1 \
            -s EXPORTED_FUNCTIONS='["_generate_tone", "_malloc", "_free"]' \
            -s EXPORTED_RUNTIME_METHODS='["ccall", "cwrap"]' \
            -s MODULARIZE=1 \
            -s ALLOW_MEMORY_GROWTH=1

      # Deploy to Cloudflare Pages
      - name: Deploy to Cloudflare Pages
        uses: cloudflare/pages-action@1
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          projectName: wasm-tone-generator
          directory: .
          gitHubToken: ${{ secrets.GITHUB_TOKEN }}
```

---

#### **📄 `package.json` (Optional for Local Dev)**
```json
{
  "name": "wasm-tone-generator",
  "version": "1.0.0",
  "description": "WASM Tone Generator with Web Audio API",
  "scripts": {
    "serve": "npx http-server -p 8000 -c-1",
    "compile-wasm": "emcc src/tone_generator.c -o wasm/tone_generator.wasm -s WASM=1 -s EXPORTED_FUNCTIONS='[\"_generate_tone\", \"_malloc\", \"_free\"]' -s MODULARIZE=1 -s ALLOW_MEMORY_GROWTH=1"
  },
  "devDependencies": {
    "http-server": "^14.1.1"
  }
}
```

---

### **🔹 Step 3: Set Up Cloudflare Pages**
1. **Log in to Cloudflare Dashboard** ([https://dash.cloudflare.com](https://dash.cloudflare.com)).
2. **Create a new Pages project**:
   - Click **Workers & Pages** > **Create application** > **Pages** > **Connect GitHub account**.
   - Select your repository (`wasm-tone-generator`).
   - Set the **Production branch** to `main`.
   - Set the **Build command** to `echo "No build command needed"` (WASM is pre-compiled in GitHub Actions).
   - Set the **Build output directory** to `.` (root).
3. **Add Environment Variables**:
   - No variables are needed for static deployment.
4. **Deploy**: Click **Save and Deploy**. Cloudflare Pages will automatically deploy when you push to `main`.

---

### **🔹 Step 4: Configure GitHub Secrets**
1. **Get Cloudflare API Token**:
   - Go to **Cloudflare Dashboard** > **My Profile** > **API Tokens** > **Create Token**.
   - Use the **Edit Cloudflare Pages** template.
   - Copy the generated token.
2. **Add Secrets to GitHub**:
   - Go to your repository **Settings** > **Secrets and variables** > **Actions**.
   - Add the following secrets:
     - `CLOUDFLARE_API_TOKEN`: Your Cloudflare API token.
     - `CLOUDFLARE_ACCOUNT_ID`: Your Cloudflare Account ID (found in the dashboard URL).

---

### **🔹 Step 5: Push to GitHub and Deploy**
1. **Commit and push** your code to the `main` branch:
   ```bash
   git add .
   git commit -m "Initial commit: WASM Tone Generator"
   git push origin main
   ```
2. **GitHub Actions** will automatically:
   - Compile `tone_generator.c` to `wasm/tone_generator.wasm`.
   - Deploy to Cloudflare Pages.
3. **Verify Deployment**:
   - After a few minutes, your site will be live at `https://wasm-tone-generator.pages.dev`.
   - Test the **Play 440Hz Tone** button.

---

## **🚀 Local Development (Optional)**

### **1. Install Emscripten Locally**
Follow the [Emscripten installation guide](https://emscripten.org/docs/getting_started/downloads.html).

### **2. Compile WASM Manually**
```bash
mkdir -p wasm
emcc src/tone_generator.c -o wasm/tone_generator.wasm \
  -s WASM=1 \
  -s EXPORTED_FUNCTIONS='["_generate_tone", "_malloc", "_free"]' \
  -s MODULARIZE=1 \
  -s ALLOW_MEMORY_GROWTH=1
```

### **3. Serve Locally**
```bash
npm install
npm run serve
```
Open [http://localhost:8000](http://localhost:8000) in your browser.

---

## **⚡ How It Works**

### **1. WASM Compilation**
- The **C function** `generate_tone` fills a float buffer with sine wave samples.
- **Emscripten** compiles this to WASM, exposing `generate_tone`, `malloc`, and `free`.

### **2. Web Audio API Integration**
- **JavaScript** (`app.js`):
  1. Loads the WASM module using `WebAssembly.instantiateStreaming`.
  2. Allocates memory in WASM for the audio buffer.
  3. Calls `generate_tone` to fill the buffer with a 440Hz sine wave.
  4. Copies the WASM memory to an `AudioBuffer`.
  5. Plays the buffer using `AudioBufferSourceNode`.

### **3. Cloudflare Pages**
- Serves static files (HTML, JS, WASM) with correct MIME types.
- **No additional configuration** is needed for `.wasm` files.

---

## **📊 Performance Notes**
| Task                     | Time (Approx.) | Notes                                  |
|--------------------------|----------------|----------------------------------------|
| WASM Compilation (CI)    | ~30-60s        | Depends on GitHub Actions runner.      |
| WASM Loading (Browser)   | ~10-50ms       | Streaming instantiation is fast.      |
| Tone Generation          | ~1-2ms         | WASM is near-native speed.             |
| Audio Playback           | Real-time      | Web Audio API handles this efficiently.|

---

## **🔧 Troubleshooting**

| Issue                          | Solution                                                                                     |
|--------------------------------|----------------------------------------------------------------------------------------------|
| **WASM not loading**           | Check browser console for MIME type errors. Ensure `.wasm` files are served with `application/wasm`. |
| **No sound**                   | Ensure the browser tab is not muted. Check `audioContext` state (may require user interaction).   |
| **GitHub Actions fails**       | Check the workflow logs. Ensure Emscripten is installed correctly.                            |
| **Cloudflare deployment fails**| Verify `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` secrets are set correctly.            |
| **WASM memory errors**         | Ensure `ALLOW_MEMORY_GROWTH=1` is set in Emscripten flags.                                     |

---

## **🌟 Contributing**
Contributions are welcome! Open an issue or submit a pull request.

---

## **📜 License**
This project is licensed under the **MIT License** – see the [LICENSE](LICENSE) file for details.

---

## **🙌 Acknowledgments**
- [Emscripten](https://emscripten.org/) – For compiling C to WASM.
- [Web Audio API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API) – For audio synthesis.
- [Cloudflare Pages](https://pages.cloudflare.com/) – For fast, free static hosting.

---

## **📞 Support**
- **Issues**: Open a GitHub issue.
- **Questions**: Start a discussion in the repository.

---

**🎵 Happy Coding!**

---

### **📌 Next Steps**
- [ ] Add a frequency slider to adjust the tone.
- [ ] Implement white noise generation in WASM.
- [ ] Add AudioWorklet for real-time streaming.
- [ ] Extend to a full synthesizer with oscillators and filters.

---

**Deployed Site**: [https://wasm-tone-generator.pages.dev](https://wasm-tone-generator.pages.dev) (Replace with your actual URL)
