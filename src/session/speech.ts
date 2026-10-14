import { useEffect, useState } from 'react';

export type VoiceStatus = 'checking' | 'available' | 'unavailable';

/** Browser voice lists can arrive after the page loads; wait briefly for voiceschanged. */
export function findVoice(lang: string): SpeechSynthesisVoice | undefined {
  if (typeof window === 'undefined' || !window.speechSynthesis?.getVoices) return undefined;
  const voices = window.speechSynthesis.getVoices();
  const code = lang.toLowerCase();
  return voices.find((voice) => voice.lang.toLowerCase() === `${code}-${code.toUpperCase()}`.toLowerCase())
    ?? voices.find((voice) => voice.lang.toLowerCase().startsWith(`${code}-`))
    ?? voices.find((voice) => voice.lang.toLowerCase() === code);
}

export function useVoiceStatus(lang: string): VoiceStatus {
  const [status, setStatus] = useState<VoiceStatus>('checking');
  useEffect(() => {
    const synth = typeof window === 'undefined' ? undefined : window.speechSynthesis;
    if (!synth?.getVoices || typeof SpeechSynthesisUtterance === 'undefined') {
      setStatus('unavailable');
      return;
    }
    const inspect = () => {
      if (findVoice(lang)) setStatus('available');
      else setStatus((current) => current === 'available' ? 'unavailable' : current);
    };
    setStatus('checking');
    inspect();
    synth.addEventListener?.('voiceschanged', inspect);
    const timeout = window.setTimeout(() => setStatus((current) => current === 'checking' ? 'unavailable' : current), 750);
    return () => { window.clearTimeout(timeout); synth.removeEventListener?.('voiceschanged', inspect); };
  }, [lang]);
  return status;
}

let waiting: number | undefined;

/**
 * Speaks a text. With `queue` it waits until speech in progress has finished (checked every 100 ms, at
 * most 8 s) instead of interrupting it; a later call drops a text that is still waiting.
 */
export function speak(text: string, lang: string, { queue = false } = {}): boolean {
  const voice = findVoice(lang);
  const synth = typeof window === 'undefined' ? undefined : window.speechSynthesis;
  if (!voice || !synth || typeof SpeechSynthesisUtterance === 'undefined') return false;
  window.clearInterval(waiting);
  waiting = undefined;
  const say = () => {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = voice.lang;
    utterance.voice = voice;
    synth.cancel();
    synth.speak(utterance);
  };
  if (!queue || !(synth.speaking || synth.pending)) {
    say();
    return true;
  }
  const started = Date.now();
  waiting = window.setInterval(() => {
    if ((synth.speaking || synth.pending) && Date.now() - started < 8000) return;
    window.clearInterval(waiting);
    waiting = undefined;
    say();
  }, 100);
  return true;
}

export type VoiceOs = 'windows' | 'mac' | 'linux' | 'chromeos' | 'android' | 'ios' | 'other';
export type VoiceBrowser = 'edge' | 'chrome' | 'firefox' | 'safari' | 'other';

/** Best-effort OS and browser detection, used only to put the matching voice-installation steps first. */
export function detectPlatform(nav: Pick<Navigator, 'userAgent' | 'maxTouchPoints'> | undefined = typeof navigator === 'undefined' ? undefined : navigator): { os: VoiceOs; browser: VoiceBrowser } {
  const ua = nav?.userAgent ?? '';
  const os: VoiceOs = /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && (nav?.maxTouchPoints ?? 0) > 1) ? 'ios'
    : /Android/.test(ua) ? 'android'
    : /CrOS/.test(ua) ? 'chromeos'
    : /Windows/.test(ua) ? 'windows'
    : /Macintosh|Mac OS X/.test(ua) ? 'mac'
    : /Linux|X11/.test(ua) ? 'linux'
    : 'other';
  const browser: VoiceBrowser = /Edg(e|A|iOS)?\//.test(ua) ? 'edge'
    : /Firefox\/|FxiOS\//.test(ua) ? 'firefox'
    : /OPR\//.test(ua) ? 'other'
    : /Chrome\/|CriOS\//.test(ua) ? 'chrome'
    : /Safari\//.test(ua) ? 'safari'
    : 'other';
  return { os, browser };
}
