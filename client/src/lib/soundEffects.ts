// Web Audio API Synthesizer - Instant Zero-Asset Sound & Haptics Engine

class SoundEffectsEngine {
    private ctx: AudioContext | null = null;
    private isMuted: boolean = false;

    constructor() {
        if (typeof window !== 'undefined') {
            this.isMuted = localStorage.getItem('quiz_sound_muted') === 'true';
        }
    }

    private getContext(): AudioContext | null {
        if (typeof window === 'undefined') return null;
        if (!this.ctx) {
            const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
            if (AudioCtx) {
                this.ctx = new AudioCtx();
            }
        }
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume().catch(() => {});
        }
        return this.ctx;
    }

    public toggleMute(): boolean {
        this.isMuted = !this.isMuted;
        if (typeof window !== 'undefined') {
            localStorage.setItem('quiz_sound_muted', String(this.isMuted));
        }
        return this.isMuted;
    }

    public getIsMuted(): boolean {
        return this.isMuted;
    }

    private vibrate(pattern: number | number[]) {
        if (typeof navigator !== 'undefined' && 'vibrate' in navigator && !this.isMuted) {
            try {
                navigator.vibrate(pattern);
            } catch {
                // Ignore vibration errors on unsupported hardware
            }
        }
    }

    /**
     * Uplifting major triad arpeggio (C5 -> E5 -> G5 -> C6)
     */
    public playCorrect() {
        if (this.isMuted) return;
        const ctx = this.getContext();
        if (!ctx) return;

        this.vibrate([40, 30, 60]);
        const now = ctx.currentTime;
        const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6

        notes.forEach((freq, idx) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, now + idx * 0.06);

            gain.gain.setValueAtTime(0, now + idx * 0.06);
            gain.gain.linearRampToValueAtTime(0.18, now + idx * 0.06 + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.06 + 0.28);

            osc.connect(gain);
            gain.connect(ctx.destination);

            osc.start(now + idx * 0.06);
            osc.stop(now + idx * 0.06 + 0.3);
        });
    }

    /**
     * Low descending buzzer
     */
    public playIncorrect() {
        if (this.isMuted) return;
        const ctx = this.getContext();
        if (!ctx) return;

        this.vibrate([100, 50, 100]);
        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(160, now);
        osc.frequency.exponentialRampToValueAtTime(110, now + 0.28);

        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now);
        osc.stop(now + 0.32);
    }

    /**
     * Escalating streak chime with multiplier pitch
     */
    public playStreak(streakCount: number) {
        if (this.isMuted) return;
        const ctx = this.getContext();
        if (!ctx) return;

        this.vibrate([30, 40, 30, 40, 70]);
        const now = ctx.currentTime;
        const baseFreq = 440 * Math.pow(1.08, Math.min(12, streakCount)); // pitch shifts up with streak

        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(baseFreq, now);
        osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.5, now + 0.15);

        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.22, now + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now);
        osc.stop(now + 0.38);
    }

    /**
     * Wooden countdown tick
     */
    public playTick() {
        if (this.isMuted) return;
        const ctx = this.getContext();
        if (!ctx) return;

        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'square';
        osc.frequency.setValueAtTime(900, now);
        osc.frequency.exponentialRampToValueAtTime(300, now + 0.04);

        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now);
        osc.stop(now + 0.06);
    }

    /**
     * Level-up triumphant fanfare
     */
    public playLevelUp() {
        if (this.isMuted) return;
        const ctx = this.getContext();
        if (!ctx) return;

        this.vibrate([60, 40, 60, 40, 120]);
        const now = ctx.currentTime;
        const chords = [
            [523.25, 659.25], // C, E
            [587.33, 739.99], // D, F#
            [659.25, 830.61], // E, G#
            [783.99, 987.77, 1046.50] // G, B, C
        ];

        chords.forEach((chord, step) => {
            const stepTime = now + step * 0.12;
            chord.forEach(freq => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();

                osc.type = 'triangle';
                osc.frequency.setValueAtTime(freq, stepTime);

                gain.gain.setValueAtTime(0, stepTime);
                gain.gain.linearRampToValueAtTime(0.15, stepTime + 0.02);
                gain.gain.exponentialRampToValueAtTime(0.001, stepTime + (step === chords.length - 1 ? 0.6 : 0.25));

                osc.connect(gain);
                gain.connect(ctx.destination);

                osc.start(stepTime);
                osc.stop(stepTime + 0.65);
            });
        });
    }

    /**
     * Power-up sci-fi sweep
     */
    public playPowerUp() {
        if (this.isMuted) return;
        const ctx = this.getContext();
        if (!ctx) return;

        this.vibrate([50, 50, 80]);
        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(200, now);
        osc.frequency.exponentialRampToValueAtTime(1200, now + 0.3);

        gain.gain.setValueAtTime(0.05, now);
        gain.gain.linearRampToValueAtTime(0.2, now + 0.15);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now);
        osc.stop(now + 0.38);
    }

    /**
     * Loot box magic unboxing sparkle
     */
    public playLootboxOpen() {
        if (this.isMuted) return;
        const ctx = this.getContext();
        if (!ctx) return;

        this.vibrate([80, 50, 100, 50, 150]);
        const now = ctx.currentTime;
        for (let i = 0; i < 8; i++) {
            const time = now + i * 0.05;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.type = 'sine';
            osc.frequency.setValueAtTime(600 + i * 140, time);

            gain.gain.setValueAtTime(0, time);
            gain.gain.linearRampToValueAtTime(0.12, time + 0.01);
            gain.gain.exponentialRampToValueAtTime(0.001, time + 0.25);

            osc.connect(gain);
            gain.connect(ctx.destination);

            osc.start(time);
            osc.stop(time + 0.28);
        }
    }
}

export const sounds = new SoundEffectsEngine();
