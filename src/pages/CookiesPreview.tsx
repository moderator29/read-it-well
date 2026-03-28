import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import { MessageSquare, Share2, Copy, Check, ArrowLeft, Sparkles } from "lucide-react";
import ParticleField from "@/components/shared/ParticleField";
import shibaImg from "@/assets/shiba-hero.png";

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
    const text = encodeURIComponent(`🍪 ${message}\n\n#NAKAGO`);
    window.open(`https://x.com/intent/tweet?in_reply_to=${tweetId}&text=${text}`, "_blank");
  };

  const handleQuoteRepost = () => {
    const text = encodeURIComponent(`🍪 ${message}\n\n#NAKAGO`);
    window.open(`https://x.com/intent/tweet?text=${text}&url=${encodeURIComponent(postUrl)}`, "_blank");
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(`🍪 ${message}\n\n#NAKAGO\n${postUrl}`);
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

        <motion.div
          className="text-center mb-10"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="font-display text-3xl md:text-4xl text-gradient mb-2">
            <Sparkles className="w-8 h-8 inline-block mr-2 text-primary" />
            Preview
          </h1>
        </motion.div>

        {/* Cookie Frame */}
        <motion.div
          className="glass-card p-8 mb-8"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
        >
          <div className="bg-background/60 rounded-2xl p-6 border border-border">
            <div className="flex items-center gap-3 mb-4">
              <img src={shibaImg} alt="Naka Go" className="w-10 h-10 rounded-full" />
              <div>
                <p className="font-display text-foreground text-sm">@nakago</p>
                <p className="font-body text-muted-foreground text-xs">Cookies 'n' Cream</p>
              </div>
            </div>
            <p className="font-body text-foreground text-lg leading-relaxed mb-4">
              🍪 {message}
            </p>
            <p className="font-body text-primary text-sm">#NAKAGO</p>
          </div>
        </motion.div>

        {/* Actions */}
        <motion.div
          className="space-y-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleReply}
            className="w-full py-5 bg-gradient-naka text-primary-foreground font-display text-lg rounded-full glow-orange hover:glow-orange-intense transition-all flex items-center justify-center gap-3"
          >
            <MessageSquare className="w-6 h-6" />
            X Reply
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleQuoteRepost}
            className="w-full py-5 bg-gradient-to-r from-yellow-500 to-amber-500 text-white font-display text-lg rounded-full shadow-lg shadow-yellow-500/30 transition-all flex items-center justify-center gap-3"
          >
            <Share2 className="w-6 h-6" />
            X Quote Repost
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleCopy}
            className="w-full py-5 bg-gradient-to-r from-amber-800 to-amber-700 text-white font-display text-lg rounded-full shadow-lg shadow-amber-800/30 transition-all flex items-center justify-center gap-3"
          >
            {copied ? <><Check className="w-6 h-6" /> Copied!</> : <><Copy className="w-6 h-6" /> Copy Cookie</>}
          </motion.button>
        </motion.div>

        {/* About */}
        <motion.div
          className="glass-card p-6 mt-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
        >
          <p className="font-body text-muted-foreground text-sm leading-relaxed">
            <strong className="text-foreground">About the Cookie Frame:</strong> This special format encourages meaningful, personal messages. The cookies represent the framework, and your message is the sweet cream that fills it with purpose.
          </p>
        </motion.div>
      </div>
    </div>
  );
};

export default CookiesPreview;
