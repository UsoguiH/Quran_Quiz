import { useEffect, useRef } from 'react';
import { sfx } from '../sfx';
import { isConfirm, useKeys, useTimers } from '../components/stage';

/** Big "Round N" stinger that plays before each round. Tap or press A to skip it. */
export function RoundBanner({ n, title, hint, onDone }: { n: number; title: string; hint: string; onDone: () => void }) {
  const fired = useRef(false);
  const later = useTimers();
  const go = () => {
    if (fired.current) return;
    fired.current = true;
    // defer, so the key press that skipped the banner doesn't also count as the round's first move
    window.setTimeout(onDone, 0);
  };
  useEffect(() => {
    sfx('confirm');
    later(go, 2000);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useKeys((e) => {
    if (isConfirm(e) && !e.repeat) {
      e.preventDefault();
      go();
    }
  });
  return (
    <button type="button" className="st-round" onClick={go}>
      <small>Round {n}</small>
      <b>{title}</b>
      <span>{hint}</span>
    </button>
  );
}

export const pick = <T,>(list: T[]): T => list[Math.floor(Math.random() * list.length)];
