import { useEffect, useRef, type MutableRefObject } from 'react';
import { H, W, paintScene, vignette, type View } from '../pixel/scenes';
import type { Fx } from './stage';

export type StageView = Omit<View, 'doorStart'>;

/** Low-res canvas that repaints the current scene, then any round or cutscene effects, every frame. */
export function PixelStage({ view, fx }: { view: StageView; fx: MutableRefObject<Fx | null> }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const viewRef = useRef(view);
  viewRef.current = view;

  useEffect(() => {
    const c = canvasRef.current?.getContext('2d');
    if (!c) return;
    let raf = 0;
    const loop = (t: number) => {
      c.imageSmoothingEnabled = false;
      const f = fx.current;
      if (!f?.replace) paintScene(c, t, { ...viewRef.current, doorStart: null });
      f?.draw(c, t);
      vignette(c);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [fx]);

  return <canvas ref={canvasRef} className="st-canvas" width={W} height={H} aria-hidden="true" />;
}
