'use client';

import { useEffect, useRef, useState } from 'react';

type SignaturePadProps = {
  value: string | null;
  onChange: (dataUrl: string | null) => void;
};

export default function SignaturePad({ value, onChange }: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawingRef = useRef(false);
  const [hasDrawn, setHasDrawn] = useState(Boolean(value));

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext('2d');
    if (!context) return;

    context.fillStyle = '#0A0E17';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.strokeStyle = '#ffffff';
    context.lineWidth = 2.2;
    context.lineCap = 'round';
    context.lineJoin = 'round';

    if (value) {
      const image = new Image();
      image.onload = () => {
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
      };
      image.src = value;
    }
  }, [value]);

  const pointFromEvent = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * canvas.width,
      y: ((event.clientY - rect.top) / rect.height) * canvas.height,
    };
  };

  const commit = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (!hasDrawn) {
      onChange(null);
      return;
    }
    onChange(canvas.toDataURL('image/png'));
  };

  return (
    <div className="space-y-3">
      <canvas
        ref={canvasRef}
        width={960}
        height={260}
        className="h-44 w-full rounded-2xl border border-white/10 bg-[#0A0E17]"
        onPointerDown={(event) => {
          const canvas = canvasRef.current;
          const context = canvas?.getContext('2d');
          const point = pointFromEvent(event);
          if (!context || !point) return;
          drawingRef.current = true;
          context.beginPath();
          context.moveTo(point.x, point.y);
          setHasDrawn(true);
        }}
        onPointerMove={(event) => {
          if (!drawingRef.current) return;
          const canvas = canvasRef.current;
          const context = canvas?.getContext('2d');
          const point = pointFromEvent(event);
          if (!context || !point) return;
          context.lineTo(point.x, point.y);
          context.stroke();
        }}
        onPointerUp={() => {
          drawingRef.current = false;
          commit();
        }}
        onPointerLeave={() => {
          drawingRef.current = false;
          commit();
        }}
      />
      <div className="flex items-center justify-between gap-3 text-xs text-[#8f98ab]">
        <span>Draw your signature. A clear typed name is still recommended for audit readability.</span>
        <button
          type="button"
          className="rounded-full border border-white/10 px-3 py-1.5 text-white transition hover:bg-white/5"
          onClick={() => {
            setHasDrawn(false);
            onChange(null);
          }}
        >
          Clear
        </button>
      </div>
    </div>
  );
}
