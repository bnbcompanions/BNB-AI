import { useEffect, useRef } from "react";

/* ─── Liquid light blob ─── */
interface LightBlob {
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  radius: number;
  baseRadius: number;
  color: string;
  speed: number;
  offset: number;       // phase offset for organic wobble
  vx: number;
  vy: number;
}

function createBlobs(): LightBlob[] {
  const colors = [
    "rgba(240, 185, 11, 0.12)",   // bnb gold
    "rgba(240, 185, 11, 0.08)",   // dimmer gold
    "rgba(200, 160, 60, 0.07)",   // amber
    "rgba(180, 130, 255, 0.05)",  // subtle purple
    "rgba(240, 200, 80, 0.06)",   // warm gold
  ];
  return colors.map((color, i) => ({
    x: 0,
    y: 0,
    targetX: 0,
    targetY: 0,
    radius: 80 + i * 30,
    baseRadius: 80 + i * 30,
    color,
    speed: 0.03 + i * 0.012,
    offset: (i * Math.PI * 2) / colors.length,
    vx: 0,
    vy: 0,
  }));
}

const isTouch = typeof window !== "undefined" && window.matchMedia("(hover: none)").matches;

export default function CustomCursor() {
  const cursorRef = useRef<HTMLDivElement>(null);
  const dotRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const blobsRef = useRef<LightBlob[]>(createBlobs());
  const mouseRef = useRef({ x: -500, y: -500 });
  const velRef = useRef({ x: 0, y: 0 });
  const prevMouseRef = useRef({ x: -500, y: -500 });

  useEffect(() => {
    if (isTouch) return;
    const cursor = cursorRef.current;
    const dot = dotRef.current;
    const canvas = canvasRef.current;
    if (!cursor || !dot || !canvas) return;

    const ctx = canvas.getContext("2d")!;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    let mouseX = -500;
    let mouseY = -500;
    let cursorX = -500;
    let cursorY = -500;

    const onMove = (e: MouseEvent) => {
      prevMouseRef.current = { ...mouseRef.current };
      mouseX = e.clientX;
      mouseY = e.clientY;
      mouseRef.current = { x: mouseX, y: mouseY };
      velRef.current = {
        x: mouseX - prevMouseRef.current.x,
        y: mouseY - prevMouseRef.current.y,
      };
      dot.style.left = `${mouseX}px`;
      dot.style.top = `${mouseY}px`;
    };

    const onOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest("button, a, [role='button'], .chatbot-fab")) {
        cursor.classList.add("hovering");
      }
    };

    const onOut = () => {
      cursor.classList.remove("hovering");
    };

    let time = 0;

    const tick = () => {
      time += 0.016;

      // ─── Custom cursor ring ───
      cursorX += (mouseX - cursorX) * 0.15;
      cursorY += (mouseY - cursorY) * 0.15;
      cursor.style.left = `${cursorX}px`;
      cursor.style.top = `${cursorY}px`;

      // ─── Liquid light blobs ───
      const blobs = blobsRef.current;
      const mx = mouseRef.current.x;
      const my = mouseRef.current.y;
      const speed = Math.sqrt(velRef.current.x ** 2 + velRef.current.y ** 2);

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      for (const blob of blobs) {
        // Organic target with offset from cursor
        blob.targetX = mx + Math.sin(time * 1.2 + blob.offset) * (40 + speed * 2);
        blob.targetY = my + Math.cos(time * 1.4 + blob.offset) * (30 + speed * 2);

        // Smooth follow
        blob.x += (blob.targetX - blob.x) * blob.speed;
        blob.y += (blob.targetY - blob.y) * blob.speed;

        // Radius pulses with movement speed
        const dynamicRadius = blob.baseRadius + speed * 1.5 + Math.sin(time * 2 + blob.offset) * 15;
        blob.radius += (dynamicRadius - blob.radius) * 0.08;

        // Draw radial gradient blob
        const gradient = ctx.createRadialGradient(
          blob.x, blob.y, 0,
          blob.x, blob.y, blob.radius
        );
        gradient.addColorStop(0, blob.color);
        gradient.addColorStop(0.5, blob.color.replace(/[\d.]+\)$/, (m) => `${parseFloat(m) * 0.5})`));
        gradient.addColorStop(1, "transparent");

        ctx.beginPath();
        ctx.arc(blob.x, blob.y, blob.radius, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();
      }

      // Decay velocity
      velRef.current.x *= 0.9;
      velRef.current.y *= 0.9;

      requestAnimationFrame(tick);
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseover", onOver);
    window.addEventListener("mouseout", onOut);
    const raf = requestAnimationFrame(tick);

    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseover", onOver);
      window.removeEventListener("mouseout", onOut);
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(raf);
    };
  }, []);

  if (isTouch) return null;

  return (
    <>
      <canvas ref={canvasRef} className="liquid-light-canvas" />
      <div ref={cursorRef} className="custom-cursor" />
      <div ref={dotRef} className="custom-cursor-dot" />
    </>
  );
}
