import { useEffect, useRef } from 'react';
import { H, W, paint, type View } from '../pixel/scenes';

export type StageView = Omit<View, 'doorStart'> & { doorsOpening: boolean };

/** Low-res canvas that repaints the current scene every frame. */
export function PixelStage({ view }: { view: StageView }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const viewRef = useRef(view);
  viewRef.current = view;

  useEffect(() => {
    const c = canvasRef.current?.getContext('2d');
    if (!c) return;
    let raf = 0;
    let doorStart: number | null = null;
    const loop = (t: number) => {
      const v = viewRef.current;
      if (v.doorsOpening && doorStart === null) doorStart = t;
      if (!v.doorsOpening) doorStart = null;
      paint(c, t, { ...v, doorStart });
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  return <canvas ref={canvasRef} className="st-canvas" width={W} height={H} aria-hidden="true" />;
}
