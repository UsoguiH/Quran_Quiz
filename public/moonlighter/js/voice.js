'use strict';
// ============================================================================
//  VOICE: characters speak their lines with the browser's speech synthesis
//  (Web Speech API), each with their own pitch, pace and voice. When no voices
//  are available, or the player picks it, characters "babble" in blips.
// ============================================================================

const VOICE_PROFILES = {
  Narrator: { pitch: 0.85, rate: 0.9, blip: 170, prefer: ['Daniel', 'Google UK English Male', 'Arthur', 'Male', 'David', 'Alex'] },
  Keeper: { pitch: 0.4, rate: 0.95, blip: 105, prefer: ['Google UK English Male', 'Daniel', 'Fred', 'Male', 'David'] },
  'Elder Oren': { pitch: 0.55, rate: 0.84, blip: 135, prefer: ['Daniel', 'Arthur', 'Male', 'George', 'David'] },
  Aldric: { pitch: 0.7, rate: 0.86, blip: 125, prefer: ['Arthur', 'Daniel', 'Google UK English Male', 'Male'] },
  Guardian: { pitch: 0.05, rate: 0.7, blip: 70, prefer: ['Fred', 'Male', 'Daniel', 'David'] },
  'Mayor Pell': { pitch: 1.0, rate: 1.02, blip: 190, prefer: ['Google US English', 'Alex', 'Male', 'David'] },
  Brom: { pitch: 0.3, rate: 0.9, blip: 95, prefer: ['Fred', 'Male', 'Daniel', 'David'] },
  Mirabel: { pitch: 1.4, rate: 1.05, blip: 330, prefer: ['Google UK English Female', 'Samantha', 'Victoria', 'Karen', 'Female', 'Zira', 'Susan'] },
  Villager: { pitch: 1.1, rate: 1.02, blip: 240, prefer: ['Google US English', 'Samantha', 'Female', 'Zira'] },
  Pip: { pitch: 1.35, rate: 1.12, blip: 280, prefer: ['Google US English', 'Alex', 'Male', 'David'] },
};
const Voice = {
  list: [], mode: 'babble', prof: VOICE_PROFILES.Narrator, speaking: false, primed: false,
  init() {
    if (!('speechSynthesis' in window)) return;
    const load = () => { this.list = speechSynthesis.getVoices().filter(v => /^en/i.test(v.lang)); };
    load();
    try { speechSynthesis.onvoiceschanged = load; } catch (e) { /* ignore */ }
  },
  // some mobile browsers only allow speech after a gesture: say nothing once on the first input
  prime() {
    if (this.primed || !('speechSynthesis' in window)) return;
    this.primed = true;
    try { const u = new SpeechSynthesisUtterance(' '); u.volume = 0; speechSynthesis.speak(u); } catch (e) { /* ignore */ }
  },
  pick(prof) {
    if (!this.list.length) return null;
    for (const key of prof.prefer) { const v = this.list.find(v => v.name.includes(key)); if (v) return v; }
    return this.list[0];
  },
  speak(text, who) {
    this.stop();
    this.prof = VOICE_PROFILES[who] || VOICE_PROFILES.Villager;
    const pref = OPTS.voice || 'speech';
    if (pref === 'off') { this.mode = 'off'; return; }
    if (pref === 'speech' && 'speechSynthesis' in window && this.list.length) {
      try {
        const u = new SpeechSynthesisUtterance(String(text).replace(/\.\.\./g, ', '));
        const v = this.pick(this.prof); if (v) u.voice = v;
        u.pitch = this.prof.pitch; u.rate = this.prof.rate; u.volume = clamp(OPTS.voiceVol ?? 0.9, 0, 1);
        u.onend = () => { this.speaking = false; }; u.onerror = () => { this.speaking = false; };
        this.speaking = true; this.mode = 'speech';
        speechSynthesis.speak(u);
        return;
      } catch (e) { /* fall through to babble */ }
    }
    this.mode = 'babble';
  },
  // typewriter hook: in babble mode each letter makes a small pitched blip
  blip(ch, i) {
    if (this.mode !== 'babble' || !/[a-z0-9]/i.test(ch) || i % 2) return;
    AudioSys.blip(this.prof.blip * (0.88 + Math.random() * 0.3), (OPTS.voiceVol ?? 0.9));
  },
  stop() { if ('speechSynthesis' in window) { try { speechSynthesis.cancel(); } catch (e) { /* ignore */ } } this.speaking = false; },
  busy() { return this.mode === 'speech' && (this.speaking || ('speechSynthesis' in window && speechSynthesis.speaking)); },
};
