import { useState } from "react";
import { motion } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import { Lightbulb, ArrowRight, Home, PenTool, Copy, Check } from "lucide-react";
import ParticleField from "@/components/shared/ParticleField";

const suggestions = [
  "Building in public, one step at a time",
  "The journey of a thousand miles begins with one block",
  "GM to everyone building the future",
  "Honoring the legacy, creating the future",
  "One cookie, infinite possibilities",
  "Frens are for memories",
  "Naka Go saved the breed, now we build the legacy",
  "Diamond hands, golden heart",
];

const MAX_LENGTH = 200;

const CookiesCreate = () => {
  const navigate = useNavigate();
  const [message, setMessage] = useState("");
  const [postUrl, setPostUrl] = useState("");
  const [activeTab, setActiveTab] = useState<"reply" | "find">("reply");
  const [copiedSuggestion, setCopiedSuggestion] = useState<number | null>(null);

  const isValidUrl = /^https:\/\/(twitter\.com|x\.com)\/.*\/status\/\d+/.test(postUrl);
  const isValid = message.length > 0 && message.length <= MAX_LENGTH && isValidUrl;

  const handleSuggest = () => {
    const suggestion = suggestions[Math.floor(Math.random() * suggestions.length)];
    setMessage(suggestion);
  };

  const handleCopySuggestion = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedSuggestion(index);
    setTimeout(() => setCopiedSuggestion(null), 2000);
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
        <motion.div
          className="flex items-center justify-between mb-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <Link to="/cookies" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
            <Home className="w-4 h-4" /> Cookies
          </Link>
          <Link to="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors text-sm">
            <Home className="w-3.5 h-3.5" /> Home
          </Link>
        </motion.div>

        <motion.div
          className="text-center mb-8"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="font-display text-3xl md:text-4xl text-foreground mb-2">
            🍪 Create Your Cookie 🍦
          </h1>
          <p className="font-body text-muted-foreground text-sm max-w-md mx-auto">
            Create meaningful messages with our special cookie frame format. Share your thoughts and spread positivity!
          </p>
        </motion.div>

        <motion.div
          className="glass-card p-8 space-y-6"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="flex items-center gap-2 mb-2">
            <motion.div animate={{ rotate: [0, 10, -10, 0] }} transition={{ duration: 3, repeat: Infinity }}>
              <PenTool className="w-5 h-5 text-primary" />
            </motion.div>
            <h2 className="font-display text-xl text-foreground">Your Message 🍦</h2>
          </div>

          {/* Suggestions */}
          <div className="flex flex-wrap gap-2 mb-2">
            {suggestions.slice(0, 4).map((s, i) => (
              <motion.button
                key={i}
                onClick={() => setMessage(s)}
                className="text-xs font-body px-3 py-1.5 rounded-full bg-secondary text-secondary-foreground hover:bg-primary/20 hover:text-primary transition-colors inline-flex items-center gap-1"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                🍪 {s.slice(0, 25)}...
                <button
                  onClick={(e) => { e.stopPropagation(); handleCopySuggestion(s, i); }}
                  className="ml-1 hover:text-primary"
                >
                  {copiedSuggestion === i ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                </button>
              </motion.button>
            ))}
            <motion.button
              onClick={handleSuggest}
              className="text-xs font-body px-3 py-1.5 rounded-full border border-primary/30 text-primary hover:bg-primary/10 transition-colors inline-flex items-center gap-1"
              whileHover={{ scale: 1.05 }}
            >
              <Lightbulb className="w-3 h-3" /> Random
            </motion.button>
          </div>

          {/* Message textarea */}
          <div className="relative">
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="🍦 Enter your meaningful message here..."
              maxLength={MAX_LENGTH}
              className="w-full h-36 bg-background/80 border border-border focus:border-primary/50 rounded-xl p-4 text-foreground placeholder:text-muted-foreground/50 resize-none transition-all duration-300 focus:shadow-[0_0_20px_hsla(18,100%,50%,0.15)] outline-none font-body text-sm"
            />
            <span className={`absolute bottom-3 right-3 text-xs font-mono ${message.length > MAX_LENGTH * 0.9 ? "text-primary" : "text-muted-foreground"}`}>
              {message.length}/{MAX_LENGTH}
            </span>
          </div>

          {/* Tabs */}
          <div className="flex rounded-lg overflow-hidden border border-border">
            <button
              onClick={() => setActiveTab("reply")}
              className={`flex-1 py-3 font-body text-sm font-semibold transition-colors ${
                activeTab === "reply" ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              🍪 Reply to Post
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
              🔍 Find #NAKAGO
            </button>
          </div>

          {/* Post URL */}
          <div>
            <label className="font-body text-sm text-foreground font-semibold block mb-2">Post URL to Reply To 🍪</label>
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
            className="w-full py-4 bg-gradient-naka text-primary-foreground font-display text-lg rounded-full glow-orange transition-all flex items-center justify-center gap-3 disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none"
          >
            🍪 Preview Cookie 🍦
            <ArrowRight className="w-5 h-5" />
          </motion.button>
        </motion.div>
      </div>
    </div>
  );
};

export default CookiesCreate;
