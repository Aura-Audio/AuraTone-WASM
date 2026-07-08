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
