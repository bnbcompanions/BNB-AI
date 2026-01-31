import { useEffect, useRef, useCallback, useState } from "react";
import { AvatarController, type AvatarState, type AvatarQuality } from "../lib/avatar";
import { LipSync } from "../lib/lipsync";

interface AvatarStageProps {
  onReady: (lipSync: LipSync, avatar: AvatarController) => void;
  vrmPath?: string;
  /** "full" = shadows + high DPR + interactions. "preview" = low-power idle only */
  quality?: AvatarQuality;
  /** If true, only init Three.js when scrolled into view */
  lazy?: boolean;
}

export default function AvatarStage({
  onReady,
  vrmPath = "/avatars/avatar.vrm",
  quality = "full",
  lazy = false,
}: AvatarStageProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const avatarRef = useRef<AvatarController | null>(null);
  const [avatarState, setAvatarState] = useState<AvatarState>("loading");
  const [visible, setVisible] = useState(!lazy);

  // Lazy: observe when container enters viewport
  useEffect(() => {
    if (!lazy) return;
    const el = containerRef.current;
    if (!el) return;

    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          io.disconnect();
        }
      },
      { rootMargin: "200px" }, // start loading 200px before visible
    );
    io.observe(el);
    return () => io.disconnect();
  }, [lazy]);

  const handleResize = useCallback(() => {
    const canvas = canvasRef.current;
    const avatar = avatarRef.current;
    if (!canvas || !avatar) return;
    const parent = canvas.parentElement!;
    avatar.resize(parent.clientWidth, parent.clientHeight);
  }, []);

  useEffect(() => {
    if (!visible) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const parent = canvas.parentElement!;
    canvas.width = parent.clientWidth;
    canvas.height = parent.clientHeight;

    let avatar: AvatarController;
    try {
      avatar = new AvatarController(canvas, vrmPath, quality);
    } catch (e) {
      console.error("AvatarController init failed:", e);
      setAvatarState("error");
      return;
    }
    avatarRef.current = avatar;

    if (avatar.initError) {
      console.error("AvatarController init error:", avatar.initError);
      setAvatarState("error");
      return;
    }

    avatar.onStateChange = (s) => {
      console.log("[AvatarStage]", s, vrmPath);
      setAvatarState(s);
      if (s === "ready") {
        const lipSync = new LipSync(avatar);
        onReady(lipSync, avatar);
      }
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      avatar.dispose();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vrmPath, visible]);

  return (
    <div className="avatar-stage" ref={containerRef}>
      {visible && <canvas ref={canvasRef} />}

      {avatarState === "loading" && (
        <div className="avatar-overlay">
          <div className="overlay-spinner" />
          <p>Loading avatar...</p>
        </div>
      )}

      {avatarState === "missing" && (
        <div className="avatar-overlay">
          <div className="overlay-icon">📁</div>
          <h3>No Avatar Found</h3>
          <p>
            Drop a <code>.vrm</code> file into:
          </p>
          <code className="overlay-path">public/avatars/avatar.vrm</code>
          <p className="overlay-hint">
            Free VRM models: VRoid Hub, Ready Player Me
          </p>
        </div>
      )}

      {avatarState === "error" && (
        <div className="avatar-overlay">
          <div className="overlay-icon">⚠️</div>
          <h3>Avatar Load Error</h3>
          <p>Check the console for details.</p>
        </div>
      )}
    </div>
  );
}
