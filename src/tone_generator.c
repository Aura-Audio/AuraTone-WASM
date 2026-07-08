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
