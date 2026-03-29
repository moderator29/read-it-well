import { useState, useRef, useCallback, useEffect } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Home, Download, RotateCcw, Palette, Sparkles } from "lucide-react";
import ParticleField from "@/components/shared/ParticleField";
import shibaMascot from "@/assets/shiba-mascot.jpeg";

const backgrounds = [
  { name: "Naka Orange", color: "#FF6B00" },
  { name: "Naka Red", color: "#FF0000" },
  { name: "Deep Purple", color: "#7C3AED" },
  { name: "Ocean Blue", color: "#0EA5E9" },
  { name: "Emerald", color: "#10B981" },
  { name: "Gold", color: "#F59E0B" },
  { name: "Hot Pink", color: "#EC4899" },
  { name: "Dark Mode", color: "#0A0A0A" },
];

const overlays = [
  { name: "None", value: "none" },
  { name: "Laser Eyes", value: "laser" },
  { name: "Crown", value: "crown" },
  { name: "Halo", value: "halo" },
  { name: "Fire", value: "fire" },
  { name: "Stars", value: "stars" },
  { name: "Rainbow", value: "rainbow" },
];

const frames = [
  { name: "Circle", value: "circle" },
  { name: "Rounded Square", value: "rounded" },
  { name: "Diamond", value: "diamond" },
  { name: "Hexagon", value: "hexagon" },
];

const textOptions = [
  "NAKA GO",
  "$NAKA",
  "GM FRENS",
  "HODL",
  "TO THE MOON",
  "WAGMI",
  "",
];

const PfpCreator = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [bgColor, setBgColor] = useState("#FF6B00");
  const [overlay, setOverlay] = useState("none");
  const [frame, setFrame] = useState("circle");
  const [text, setText] = useState("NAKA GO");
  const [imageLoaded, setImageLoaded] = useState(false);
  const imgRef = useRef<HTMLImageElement | null>(null);

  useEffect(() => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      imgRef.current = img;
      setImageLoaded(true);
    };
    img.src = shibaMascot;
  }, []);

  const drawPfp = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !imgRef.current) return;
    const ctx = canvas.getContext("2d")!;
    const size = 512;
    canvas.width = size;
    canvas.height = size;

    // Background
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, size, size);

    // Background glow
    const grad = ctx.createRadialGradient(size/2, size/2, 50, size/2, size/2, size/2);
    grad.addColorStop(0, "rgba(255,255,255,0.15)");
    grad.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);

    // Clip path for frame
    ctx.save();
    const cx = size / 2, cy = size / 2, r = 200;
    if (frame === "circle") {
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.clip();
    } else if (frame === "rounded") {
      const rr = 30;
      ctx.beginPath();
      ctx.moveTo(cx - r + rr, cy - r);
      ctx.lineTo(cx + r - rr, cy - r);
      ctx.quadraticCurveTo(cx + r, cy - r, cx + r, cy - r + rr);
      ctx.lineTo(cx + r, cy + r - rr);
      ctx.quadraticCurveTo(cx + r, cy + r, cx + r - rr, cy + r);
      ctx.lineTo(cx - r + rr, cy + r);
      ctx.quadraticCurveTo(cx - r, cy + r, cx - r, cy + r - rr);
      ctx.lineTo(cx - r, cy - r + rr);
      ctx.quadraticCurveTo(cx - r, cy - r, cx - r + rr, cy - r);
      ctx.clip();
    } else if (frame === "diamond") {
      ctx.beginPath();
      ctx.moveTo(cx, cy - r);
      ctx.lineTo(cx + r, cy);
      ctx.lineTo(cx, cy + r);
      ctx.lineTo(cx - r, cy);
      ctx.closePath();
      ctx.clip();
    } else if (frame === "hexagon") {
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const angle = (Math.PI / 3) * i - Math.PI / 2;
        const x = cx + r * Math.cos(angle);
        const y = cy + r * Math.sin(angle);
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.clip();
    }

    // Draw mascot
    const img = imgRef.current;
    const imgSize = Math.min(img.width, img.height);
    ctx.drawImage(img, (img.width - imgSize) / 2, (img.height - imgSize) / 2, imgSize, imgSize, cx - r, cy - r, r * 2, r * 2);
    ctx.restore();

    // Frame border
    ctx.strokeStyle = "rgba(255,255,255,0.3)";
    ctx.lineWidth = 4;
    if (frame === "circle") {
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Overlays
    if (overlay === "laser") {
      ctx.fillStyle = "#FF0000";
      ctx.shadowColor = "#FF0000";
      ctx.shadowBlur = 20;
      ctx.beginPath();
      ctx.arc(cx - 50, cy - 30, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(cx + 50, cy - 30, 8, 0, Math.PI * 2);
      ctx.fill();
      // Beams
      ctx.strokeStyle = "rgba(255,0,0,0.6)";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(cx - 50, cy - 30);
      ctx.lineTo(0, size);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(cx + 50, cy - 30);
      ctx.lineTo(size, size);
      ctx.stroke();
      ctx.shadowBlur = 0;
    } else if (overlay === "crown") {
      ctx.fillStyle = "#FFD700";
      ctx.beginPath();
      ctx.moveTo(cx - 80, cy - r + 30);
      ctx.lineTo(cx - 60, cy - r - 30);
      ctx.lineTo(cx - 30, cy - r + 10);
      ctx.lineTo(cx, cy - r - 40);
      ctx.lineTo(cx + 30, cy - r + 10);
      ctx.lineTo(cx + 60, cy - r - 30);
      ctx.lineTo(cx + 80, cy - r + 30);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = "#B8860B";
      ctx.lineWidth = 2;
      ctx.stroke();
    } else if (overlay === "halo") {
      ctx.strokeStyle = "rgba(255,215,0,0.7)";
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.ellipse(cx, cy - r - 20, 80, 20, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = "rgba(255,215,0,0.3)";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.ellipse(cx, cy - r - 20, 90, 25, 0, 0, Math.PI * 2);
      ctx.stroke();
    } else if (overlay === "fire") {
      for (let i = 0; i < 8; i++) {
        const angle = (Math.PI * 2 / 8) * i;
        const fx = cx + (r + 30) * Math.cos(angle);
        const fy = cy + (r + 30) * Math.sin(angle);
        const fg = ctx.createRadialGradient(fx, fy, 0, fx, fy, 25);
        fg.addColorStop(0, "rgba(255,100,0,0.8)");
        fg.addColorStop(1, "rgba(255,0,0,0)");
        ctx.fillStyle = fg;
        ctx.beginPath();
        ctx.arc(fx, fy, 25, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (overlay === "stars") {
      ctx.fillStyle = "#FFD700";
      for (let i = 0; i < 12; i++) {
        const sx = Math.random() * size;
        const sy = Math.random() * size;
        ctx.beginPath();
        for (let j = 0; j < 5; j++) {
          const a = (Math.PI * 2 / 5) * j - Math.PI / 2;
          const x = sx + 8 * Math.cos(a);
          const y = sy + 8 * Math.sin(a);
          j === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.fill();
      }
    } else if (overlay === "rainbow") {
      const colors = ["#FF0000", "#FF7700", "#FFFF00", "#00FF00", "#0000FF", "#8B00FF"];
      colors.forEach((c, i) => {
        ctx.strokeStyle = c;
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.arc(cx, cy + 50, r + 40 + i * 8, Math.PI, 0);
        ctx.stroke();
      });
    }

    // Text
    if (text) {
      ctx.fillStyle = "white";
      ctx.strokeStyle = "rgba(0,0,0,0.5)";
      ctx.lineWidth = 4;
      ctx.font = 'bold 36px "Permanent Marker", cursive';
      ctx.textAlign = "center";
      ctx.strokeText(text, cx, size - 40);
      ctx.fillText(text, cx, size - 40);
    }
  }, [bgColor, overlay, frame, text, imageLoaded]);

  useEffect(() => {
    drawPfp();
  }, [drawPfp]);

  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = "naka-go-pfp.png";
    link.href = canvas.toDataURL("image/png");
    link.click();
  };

  const handleRandom = () => {
    setBgColor(backgrounds[Math.floor(Math.random() * backgrounds.length)].color);
    setOverlay(overlays[Math.floor(Math.random() * overlays.length)].value);
    setFrame(frames[Math.floor(Math.random() * frames.length)].value);
    setText(textOptions[Math.floor(Math.random() * textOptions.length)]);
  };

  return (
    <div className="relative min-h-screen bg-background overflow-hidden">
      <ParticleField />

      <div className="relative z-10 container mx-auto px-6 py-24 max-w-3xl">
        <motion.div className="flex items-center justify-between mb-8" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <Link to="/app" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
            <Home className="w-4 h-4" /> Hub
          </Link>
          <Link to="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors text-sm">
            <Home className="w-3.5 h-3.5" /> Home
          </Link>
        </motion.div>

        <motion.div className="text-center mb-8" initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
          <motion.div animate={{ rotate: [0, 10, -10, 0] }} transition={{ duration: 3, repeat: Infinity }} className="inline-block mb-3">
            <Palette className="w-10 h-10 text-primary" />
          </motion.div>
          <h1 className="font-display text-3xl md:text-5xl text-gradient mb-2">PFP Creator 🎨</h1>
          <p className="font-body text-muted-foreground">Create your unique Naka Go profile picture</p>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Preview */}
          <motion.div
            className="glass-card p-6 flex flex-col items-center"
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            <canvas
              ref={canvasRef}
              className="w-64 h-64 md:w-80 md:h-80 rounded-2xl shadow-2xl mb-6"
              width={512}
              height={512}
            />
            <div className="flex gap-3 w-full">
              <motion.button
                onClick={handleDownload}
                className="flex-1 py-3 bg-gradient-naka text-primary-foreground font-display rounded-xl glow-orange inline-flex items-center justify-center gap-2"
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
              >
                <Download className="w-4 h-4" /> Download
              </motion.button>
              <motion.button
                onClick={handleRandom}
                className="py-3 px-4 bg-secondary text-foreground font-display rounded-xl border border-border inline-flex items-center gap-2"
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
              >
                <RotateCcw className="w-4 h-4" /> Random
              </motion.button>
            </div>
          </motion.div>

          {/* Controls */}
          <motion.div
            className="glass-card p-6 space-y-6"
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
          >
            {/* Background */}
            <div>
              <label className="font-display text-sm text-foreground mb-3 block">
                <Sparkles className="w-4 h-4 inline mr-2 text-primary" />
                Background
              </label>
              <div className="grid grid-cols-4 gap-2">
                {backgrounds.map((bg) => (
                  <motion.button
                    key={bg.name}
                    onClick={() => setBgColor(bg.color)}
                    className={`w-full aspect-square rounded-xl border-2 transition-all ${bgColor === bg.color ? "border-primary scale-110" : "border-border"}`}
                    style={{ backgroundColor: bg.color }}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    title={bg.name}
                  />
                ))}
              </div>
            </div>

            {/* Frame */}
            <div>
              <label className="font-display text-sm text-foreground mb-3 block">Frame Shape</label>
              <div className="grid grid-cols-4 gap-2">
                {frames.map((f) => (
                  <motion.button
                    key={f.value}
                    onClick={() => setFrame(f.value)}
                    className={`py-2 rounded-lg font-body text-xs transition-all ${frame === f.value ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"}`}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    {f.name}
                  </motion.button>
                ))}
              </div>
            </div>

            {/* Overlay */}
            <div>
              <label className="font-display text-sm text-foreground mb-3 block">Effects</label>
              <div className="grid grid-cols-4 gap-2">
                {overlays.map((o) => (
                  <motion.button
                    key={o.value}
                    onClick={() => setOverlay(o.value)}
                    className={`py-2 rounded-lg font-body text-xs transition-all ${overlay === o.value ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"}`}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    {o.name}
                  </motion.button>
                ))}
              </div>
            </div>

            {/* Text */}
            <div>
              <label className="font-display text-sm text-foreground mb-3 block">Text</label>
              <div className="grid grid-cols-4 gap-2">
                {textOptions.map((t) => (
                  <motion.button
                    key={t || "none"}
                    onClick={() => setText(t)}
                    className={`py-2 rounded-lg font-body text-xs transition-all ${text === t ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"}`}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    {t || "None"}
                  </motion.button>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default PfpCreator;
