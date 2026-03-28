import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import { MessageSquare, Share2, Copy, Check, ArrowLeft, Eye } from "lucide-react";
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

  const handleReply = () => {
    const text = encodeURIComponent(`🍪 Create one message that counts, for yourself\n\n🍦 ${message}\n\n🍪 Copy the cookies, and fill in your cream\n#NAKAGO`);
    window.open(`https://x.com/intent/tweet?in_reply_to=${tweetId}&text=${text}`, "_blank");
  };

  const handleQuoteRepost = () => {
    const text = encodeURIComponent(`🍪 Create one message that counts, for yourself\n\n🍦 ${message}\n\n🍪 Copy the cookies, and fill in your cream\n#NAKAGO`);
    window.open(`https://x.com/intent/tweet?text=${text}&url=${encodeURIComponent(postUrl)}`, "_blank");
  };

  const handleCopy = () => {
    const cookieText = `🍪 Create one message that counts, for yourself\n\n🍦 ${message}\n\n🍪 Copy the cookies, and fill in your cream\n#NAKAGO\n${postUrl}`;
    navigator.clipboard.writeText(cookieText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative min-h-screen bg-background overflow-hidden">
      <ParticleField />

      <div className="relative z-10 container mx-auto px-6 py-24 max-w-2xl">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <Link to="/cookies/create" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-8">
            <ArrowLeft className="w-4 h-4" /> Edit Cookie
          </Link>
        </motion.div>

        {/* Actions */}
        <motion.div
          className="space-y-3 mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleReply}
            className="w-full py-4 bg-gradient-naka text-primary-foreground font-display text-lg rounded-xl glow-orange hover:glow-orange-intense transition-all flex items-center justify-center gap-3"
          >
            <span className="text-xl">𝕏</span>
            Reply
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleQuoteRepost}
            className="w-full py-4 bg-gradient-to-r from-yellow-600 to-amber-600 text-white font-display text-lg rounded-xl shadow-lg shadow-yellow-600/20 transition-all flex items-center justify-center gap-3"
          >
            <span className="text-xl">𝕏</span>
            Quote Repost
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleCopy}
            className="w-full py-4 bg-gradient-to-r from-amber-800/80 to-amber-700/80 text-foreground/80 font-display text-lg rounded-xl border border-border transition-all flex items-center justify-center gap-3"
          >
            {copied ? <><Check className="w-5 h-5" /> Copied!</> : <><Copy className="w-5 h-5" /> Copy Cookie</>}
          </motion.button>
        </motion.div>

        {/* Preview Frame */}
        <motion.div
          className="glass-card p-6"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.4 }}
        >
          <div className="flex items-center gap-2 mb-4">
            <Eye className="w-5 h-5 text-foreground" />
            <h2 className="font-display text-xl text-foreground">Preview</h2>
          </div>

          {/* Cookie card with orange border */}
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
              <p className="font-display text-primary text-sm">#NAKAGO</p>
              <p className="font-body text-muted-foreground text-xs flex items-center gap-1">
                <span className="text-lg">𝕏</span> Ready to share!
              </p>
            </div>
          </div>
        </motion.div>

        {/* Footer */}
        <motion.p
          className="text-center font-body text-muted-foreground text-xs mt-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
        >
          nakago.app
        </motion.p>
      </div>
    </div>
  );
};

export default CookiesPreview;
