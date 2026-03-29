import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import { Copy, Check, Home, Eye, ExternalLink } from "lucide-react";
import ParticleField from "@/components/shared/ParticleField";

const CookiesPreview = () => {
  const navigate = useNavigate();
  const [message, setMessage] = useState("");
  const [postUrl, setPostUrl] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const savedMessage = localStorage.getItem("cookieMessage");
    const savedUrl = localStorage.getItem("cookiePostUrl");
    if (!savedMessage || !savedUrl) {
      navigate("/cookies/create");
      return;
    }
    setMessage(savedMessage);
    setPostUrl(savedUrl);
  }, [navigate]);

  const tweetId = postUrl.match(/status\/(\d+)/)?.[1] || "";

  const cookieText = `🍪 Create one message that counts, for yourself\n\n🍦 ${message}\n\n🍪 Copy the cookies, and fill in your cream\n#NAKAGO 🍪🍦`;

  const handleReply = () => {
    const text = encodeURIComponent(cookieText);
    window.open(`https://x.com/intent/tweet?in_reply_to=${tweetId}&text=${text}`, "_blank");
  };

  const handleQuoteRepost = () => {
    const text = encodeURIComponent(cookieText);
    window.open(`https://x.com/intent/tweet?text=${text}&url=${encodeURIComponent(postUrl)}`, "_blank");
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(`${cookieText}\n${postUrl}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleTrackOnX = () => {
    window.open("https://x.com/search?q=%23NAKAGO&f=live", "_blank");
  };

  return (
    <div className="relative min-h-screen bg-background overflow-hidden">
      <ParticleField />

      <div className="relative z-10 container mx-auto px-6 py-24 max-w-2xl">
        <motion.div className="flex items-center justify-between mb-8" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <Link to="/cookies/create" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
            <Home className="w-4 h-4" /> Edit
          </Link>
          <Link to="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors text-sm">
            <Home className="w-3.5 h-3.5" /> Home
          </Link>
        </motion.div>

        {/* Preview Frame */}
        <motion.div
          className="glass-card p-6 mb-6"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
        >
          <div className="flex items-center gap-2 mb-4">
            <Eye className="w-5 h-5 text-foreground" />
            <h2 className="font-display text-xl text-foreground">🍪 Preview 🍦</h2>
          </div>

          <div className="rounded-2xl p-1 bg-gradient-naka">
            <div className="bg-background rounded-xl p-6 space-y-4">
              <p className="font-mono text-foreground text-sm leading-relaxed">
                🍪 Create one message that counts, for yourself
              </p>
              <p className="font-mono text-foreground text-sm leading-relaxed">
                🍦 {message}
              </p>
              <p className="font-mono text-foreground text-sm leading-relaxed">
                🍪 Copy the cookies, and fill in your cream
              </p>
              <p className="font-display text-primary text-sm">#NAKAGO 🍪🍦</p>
            </div>
          </div>
        </motion.div>

        {/* Actions */}
        <motion.div
          className="space-y-3 mb-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleReply}
            className="w-full py-4 bg-gradient-naka text-primary-foreground font-display text-lg rounded-xl glow-orange transition-all flex items-center justify-center gap-3"
          >
            🍪 Reply on X
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleQuoteRepost}
            className="w-full py-4 bg-gradient-to-r from-yellow-600 to-amber-600 text-white font-display text-lg rounded-xl shadow-lg shadow-yellow-600/20 transition-all flex items-center justify-center gap-3"
          >
            🍦 Quote Repost on X
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleCopy}
            className="w-full py-4 bg-secondary text-foreground font-display text-lg rounded-xl border border-border transition-all flex items-center justify-center gap-3"
          >
            {copied ? <><Check className="w-5 h-5" /> 🍪 Copied!</> : <><Copy className="w-5 h-5" /> 🍪 Copy Cookie</>}
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleTrackOnX}
            className="w-full py-3 border border-primary/30 text-primary font-display text-base rounded-xl transition-all flex items-center justify-center gap-3 hover:bg-primary/10"
          >
            <ExternalLink className="w-4 h-4" /> Track #NAKAGO on X 🍪
          </motion.button>
        </motion.div>

        <motion.p
          className="text-center font-body text-muted-foreground text-xs"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          nakago.app 🍦
        </motion.p>
      </div>
    </div>
  );
};

export default CookiesPreview;
