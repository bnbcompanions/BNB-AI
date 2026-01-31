/**
 * Lip-sync controller with speaking animations.
 *
 * Amplitude mode: maps RMS from WebAudio AnalyserNode to mouth + body motion.
 * When speaking, the avatar nods, shifts weight, and moves naturally.
 */

import { AvatarController } from "./avatar";

export class LipSync {
  private avatar: AvatarController;
  private active = false;
  private frameId = 0;
  private targetMouth = 0;
  private currentMouth = 0;

  // Speaking state for body animations
  private speaking = false;
  private speakTime = 0;

  // Smoothed amplitude for body motion (slower than mouth)
  private smoothAmplitude = 0;

  constructor(avatar: AvatarController) {
    this.avatar = avatar;
  }

  /** Start lip animation loop */
  start(): void {
    this.active = true;
    this.speaking = true;
    this.speakTime = 0;
    this.tick();
  }

  /** Word boundary pulse (Web Speech API fallback) */
  onBoundary(): void {
    this.targetMouth = 0.5 + Math.random() * 0.5;
    setTimeout(() => {
      if (this.active) this.targetMouth = 0.05 + Math.random() * 0.15;
    }, 70 + Math.random() * 50);
  }

  /** Amplitude-driven mouth (from audio analyser RMS 0-1) */
  setAmplitude(v: number): void {
    // Noise gate: ignore very low amplitudes
    const gated = v < 0.03 ? 0 : v;
    // Gentler curve — keeps range dynamic instead of saturating at 1.0
    const shaped = Math.pow(gated, 0.4) * 1.8;
    this.targetMouth = Math.min(1, shaped);
    // Slow-tracked amplitude for body animations
    this.smoothAmplitude += (gated - this.smoothAmplitude) * 0.12;
  }

  /** Stop and reset */
  stop(): void {
    this.active = false;
    this.speaking = false;
    this.speakTime = 0;
    this.smoothAmplitude = 0;
    cancelAnimationFrame(this.frameId);
    this.targetMouth = 0;
    this.currentMouth = 0;
    this.avatar.setMouth(0);
    this.avatar.setSpeaking(false, 0, 0);
  }

  private tick = (): void => {
    if (!this.active) return;

    // Mouth interpolation — fast attack, fast release for syllable definition
    const lerpFactor = this.targetMouth > this.currentMouth ? 0.5 : 0.45;
    this.currentMouth += (this.targetMouth - this.currentMouth) * lerpFactor;

    // Micro jitter for organic feel
    const jitter = (Math.random() - 0.5) * 0.04;
    this.avatar.setMouth(Math.max(0, Math.min(1, this.currentMouth + jitter)));

    // Update speaking time and body animations
    this.speakTime += 1 / 60; // ~60fps
    this.avatar.setSpeaking(this.speaking, this.speakTime, this.smoothAmplitude);

    this.frameId = requestAnimationFrame(this.tick);
  };
}
