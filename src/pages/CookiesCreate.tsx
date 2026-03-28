import { useState } from "react";
import { motion } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import { Lightbulb, Hash, LinkIcon, ArrowRight, ArrowLeft, PenTool } from "lucide-react";
import ParticleField from "@/components/shared/ParticleField";
import shibaMascot from "@/assets/shiba-mascot.jpeg";

const suggestions = [
  "Building in public, one step at a time",
  "The journey of a thousand miles begins with one block",
  "GM to everyone building the future",
  "Honoring the legacy, creating the future",
  "One cookie, infinite possibilities",
  "Frens are for memories",
];

const MAX_LENGTH = 200;

const CookiesCreate = () => {
  const navigate = useNavigate();
  const [message, setMessage] = useState("");
  const [postUrl, setPostUrl] = useState("");
  const [activeTab, setActiveTab] = useState<"reply" | "find">("reply");

  const isValidUrl = /^https:\/\/(twitter\.com|x\.com)\/.*\/status\/\d+/.test(postUrl);
  const isValid = message.length > 0 && message.length <= MAX_LENGTH && isValidUrl;

  const handleSuggest = () => {
    setMessage(suggestions[Math.floor(Math.random() * suggestions.length)]);
  };

  const handleNext = () => {
    if (isValid) {
      localStorage.setItem("cookieMessage", message);
      localStorage.setItem("cookiePostUrl", postUrl);
      navigate("/cookies/preview");
    }
  };

  return (
    <div className="relative min-h-screen bg-background overflow-hidden">
      <ParticleField />

      <div className="relative z-10 container mx-auto px-6 py-24 max-w-2xl">
        {/* Top bar */}
        <motion.div
          className="flex items-center justify-between mb-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <Link to="/cookies" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back
          </Link>
          <Link to="/" className="inline-flex items-center gap-2">
            <img src={shibaMascot} alt="Naka Go" className="w-8 h-8 rounded-full border border-primary/30" />
            <span className="font-display text-sm text-foreground">NAKA GO App</span>
          </Link>
        </motion.div>

        {/* Header */}
        <motion.div
          className="text-center mb-8"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="font-display text-3xl md:text-4xl text-foreground mb-2">
            🍪 Cookies 'n' Cream 🍦
          </h1>
          <p className="font-body text-muted-foreground text-sm max-w-md mx-auto">
            Create meaningful messages with our special cookie frame format. Share your thoughts and spread positivity!
          </p>
        </motion.div>

        {/* Create Form */}
        <motion.div
          className="glass-card p-8 space-y-6"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="flex items-center gap-2 mb-2">
            <PenTool className="w-5 h-5 text-primary" />
            <h2 className="font-display text-xl text-foreground">Create Your Cookie</h2>
          </div>

          {/* Message */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="font-body text-sm text-foreground font-semibold">Your Message 🍦</label>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleSuggest}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-muted-foreground text-xs font-body hover:border-primary/50 hover:text-foreground transition-colors"
              >
                <Lightbulb className="w-3.5 h-3.5" />
                Suggest
              </motion.button>
            </div>
            <div className="relative">
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Enter your meaningful message here..."
                maxLength={MAX_LENGTH}
                className="w-full h-36 bg-background/80 border border-border focus:border-primary/50 rounded-xl p-4 text-foreground placeholder:text-muted-foreground/50 resize-none transition-all duration-300 focus:shadow-[0_0_20px_hsla(18,100%,50%,0.15)] outline-none font-body text-sm"
              />
              <span className={`absolute bottom-3 right-3 text-xs font-mono ${message.length > MAX_LENGTH * 0.9 ? "text-primary" : "text-muted-foreground"}`}>
                {message.length}/{MAX_LENGTH}
              </span>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex rounded-lg overflow-hidden border border-border">
            <button
              onClick={() => setActiveTab("reply")}
              className={`flex-1 py-3 font-body text-sm font-semibold transition-colors ${
                activeTab === "reply" ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Reply to Post
            </button>
            <button
              onClick={() => {
                setActiveTab("find");
                window.open("https://x.com/search?q=%23NAKAGO", "_blank");
              }}
              className={`flex-1 py-3 font-body text-sm font-semibold transition-colors ${
                activeTab === "find" ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Find #NAKAGO
            </button>
          </div>

          {/* Post URL */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="font-body text-sm text-foreground font-semibold">Post URL to Reply To</label>
              <button
                onClick={() => window.open("https://x.com/search?q=%23NAKAGO", "_blank")}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-muted-foreground text-xs font-body hover:border-primary/50 hover:text-foreground transition-colors"
              >
                <Lightbulb className="w-3.5 h-3.5" />
                Suggest URL
              </button>
            </div>
            <div className="relative">
              <input
                value={postUrl}
                onChange={(e) => setPostUrl(e.target.value)}
                placeholder="https://x.com/username/status/..."
                className="w-full bg-background/80 border border-border focus:border-primary/50 rounded-xl p-4 text-foreground placeholder:text-muted-foreground/50 transition-all duration-300 focus:shadow-[0_0_20px_hsla(18,100%,50%,0.15)] outline-none font-body text-sm"
              />
              {postUrl && (
                <span className={`absolute right-4 top-1/2 -translate-y-1/2 text-sm ${isValidUrl ? "text-green-400" : "text-destructive"}`}>
                  {isValidUrl ? "✓" : "✗"}
                </span>
              )}
            </div>
          </div>

          {/* Submit */}
          <motion.button
            whileHover={isValid ? { scale: 1.02 } : {}}
            whileTap={isValid ? { scale: 0.98 } : {}}
            onClick={handleNext}
            disabled={!isValid}
            className="w-full py-4 bg-gradient-naka text-primary-foreground font-display text-lg rounded-full glow-orange hover:glow-orange-intense transition-all flex items-center justify-center gap-3 disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none"
          >
            Preview Cookie
            <ArrowRight className="w-5 h-5" />
          </motion.button>
        </motion.div>
      </div>
    </div>
  );
};

export default CookiesCreate;
