function playTone(frequency: number, durationSec: number, volume = 0.08) {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = frequency;
    gain.gain.setValueAtTime(volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(
      0.001,
      ctx.currentTime + durationSec,
    );
    osc.start();
    osc.stop(ctx.currentTime + durationSec);
    void ctx.close();
  } catch {
    // Audio not available
  }
}

export function playNewTicketChime() {
  playTone(880, 0.35);
}

/** Lower double-tone when food sits on the pass too long. */
export function playExpoBumpChime() {
  playTone(440, 0.2, 0.1);
  setTimeout(() => playTone(330, 0.35, 0.1), 180);
}
