import { useEffect, useRef, type CSSProperties, type ReactNode } from 'react';
import type { Bubble as BubbleData } from '../game';
import { H, W } from '../pixel/scenes';
import { faceSprite, finSprite } from '../pixel/sprites';

/** Draws a cached 1x sprite canvas, scaled up in art pixels (--u). */
export function Sprite({ img, scale = 1, className }: { img: HTMLCanvasElement; scale?: number; className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current?.getContext('2d');
    if (!c) return;
    c.clearRect(0, 0, img.width, img.height);
    c.drawImage(img, 0, 0);
  }, [img]);
  return (
    <canvas
      ref={ref}
      width={img.width}
      height={img.height}
      className={`st-sprite ${className ?? ''}`}
      style={{ '--sw': img.width * scale, '--sh': img.height * scale } as CSSProperties}
      aria-hidden="true"
    />
  );
}

/** Positions children on the stage using art-pixel coordinates. */
export function At({
  x,
  y,
  anchor = 'bottom',
  children,
  className,
}: {
  x: number;
  y: number;
  anchor?: 'bottom' | 'top' | 'center';
  children: ReactNode;
  className?: string;
}) {
  const ty = anchor === 'bottom' ? '-100%' : anchor === 'top' ? '0' : '-50%';
  return (
    <div
      className={`st-at ${className ?? ''}`}
      style={{ left: `${(x / W) * 100}%`, top: `${(y / H) * 100}%`, transform: `translate(-50%, ${ty})` }}
    >
      {children}
    </div>
  );
}

export function SpeechBubble({ bubble }: { bubble: BubbleData }) {
  const { kind } = bubble;
  let body: ReactNode;
  if (kind === 'happy' || kind === 'love' || kind === 'meh' || kind === 'angry')
    body = <Sprite img={faceSprite(kind)} scale={2} />;
  else if (kind === 'ask') body = <span className="st-bubble-mark">!</span>;
  else if (kind === 'dots') body = <span className="st-bubble-dots">···</span>;
  else if (kind === 'out') body = <span className="st-bubble-out">I'm out</span>;
  else
    body = (
      <span className="st-bubble-offer">
        <b>{bubble.text}</b>
        <small>{bubble.sub}</small>
      </span>
    );
  return (
    <div className={`st-bubble st-bubble--${kind}`} role="img" aria-label={bubbleLabel(bubble)}>
      {body}
    </div>
  );
}

function bubbleLabel(b: BubbleData) {
  if (b.kind === 'offer') return `Offer ${b.text} for ${b.sub}`;
  if (b.kind === 'ask') return 'Asking a question';
  if (b.kind === 'out') return 'Out';
  if (b.kind === 'dots') return 'Waiting';
  return `Reaction: ${b.kind}`;
}

export function APrompt({ label, onClick, small }: { label: string; onClick?: () => void; small?: boolean }) {
  return (
    <button type="button" className={`st-aprompt ${small ? 'is-small' : ''}`} onClick={onClick}>
      <span className="st-abtn" aria-hidden="true">
        A
      </span>
      <span>{label}</span>
    </button>
  );
}

export function KeyBadge({ k }: { k: string }) {
  return (
    <span className="st-abtn is-key" aria-hidden="true">
      {k}
    </span>
  );
}

/** Half-dial from the reference HUD: triangles light up as questions pass. */
export function Dial({ done, total }: { done: number; total: number }) {
  const marks = Array.from({ length: total }, (_, i) => {
    const a = -80 + (160 / (total - 1)) * i;
    return (
      <span
        key={i}
        className={`st-dial-tri ${i < done ? 'is-lit' : ''}`}
        style={{ transform: `rotate(${a}deg) translateY(calc(var(--ui) * -15))` }}
      />
    );
  });
  return (
    <div className="st-dial" role="img" aria-label={`Question ${Math.min(done + 1, total)} of ${total}`}>
      <div className="st-dial-ring" />
      {marks}
      <div className="st-dial-orb">
        <span className="st-dial-count">{Math.min(done + 1, total)}</span>
      </div>
    </div>
  );
}

export function FinMeter({ value, max = 5 }: { value: number; max?: number }) {
  return (
    <div className="st-pill st-fins" role="img" aria-label={`Confidence ${value} of ${max}`}>
      <span className="st-pill-label">Nerve</span>
      {Array.from({ length: max }, (_, i) => (
        <Sprite key={i} img={finSprite(i < value)} scale={2} />
      ))}
    </div>
  );
}

export function Plate({ children, dim }: { children: ReactNode; dim?: boolean }) {
  return <div className={`st-plate ${dim ? 'is-out' : ''}`}>{children}</div>;
}
