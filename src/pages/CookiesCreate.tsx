import { useState } from "react";
import { motion } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import { Lightbulb, Hash, LinkIcon, ArrowRight, ArrowLeft, Wand2 } from "lucide-react";
import ParticleField from "@/components/shared/ParticleField";

const suggestions = [
  "Building in public, one step at a time",
  "The journey of a thousand miles begins with one block",
  "GM to everyone building the future",
  "Honoring the legacy, creating the future",
  "One cookie, infinite possibilities",
];

const MAX_LENGTH = 200;

const CookiesCreate = () => {
  const navigate = useNavigate();
  const [message, setMessage] = useState("");
  const [postUrl, setPostUrl] = useState("");

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
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <Link to="/cookies" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-8">
            <ArrowLeft className="w-4 h-4" /> Back to Rules
          </Link>
        </motion.div>

        <motion.div
          className="text-center mb-10"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="font-display text-3xl md:text-4xl text-gradient mb-2">
            <Wand2 className="w-8 h-8 inline-block mr-2 text-primary" />
            Create Your Cookie
          </h1>
          <p className="font-body text-muted-foreground">Craft your meaningful message</p>
        </motion.div>

        <motion.div
          className="glass-card p-8 space-y-6"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          {/* Message */}
          <div>
            <label className="font-body text-sm text-foreground mb-2 block font-semibold">Your Message</label>
            <div className="relative">
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Enter your meaningful message here..."
                maxLength={MAX_LENGTH}
                className="w-full h-40 bg-background/80 border-2 border-border focus:border-primary/50 rounded-2xl p-6 text-foreground placeholder:text-muted-foreground/50 resize-none transition-all duration-300 focus:shadow-[0_0_30px_hsla(18,100%,50%,0.2)] outline-none font-body"
              />
              <span className={`absolute bottom-4 right-4 text-sm font-mono ${message.length > MAX_LENGTH * 0.9 ? "text-primary" : "text-muted-foreground"}`}>
                {message.length}/{MAX_LENGTH}
              </span>
            </div>
          </div>

          {/* Action buttons */}
          <div className="grid grid-cols-2 gap-4">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleSuggest}
              className="py-4 bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl text-white font-body font-semibold shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 transition-all flex items-center justify-center gap-2"
            >
              <Lightbulb className="w-5 h-5" />
              Suggest
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => window.open("https://x.com/search?q=%23NAKAGO", "_blank")}
              className="py-4 bg-gradient-to-r from-purple-600 to-purple-700 rounded-xl text-white font-body font-semibold shadow-lg shadow-purple-500/30 hover:shadow-purple-500/50 transition-all flex items-center justify-center gap-2"
            >
              <Hash className="w-5 h-5" />
              Find #NAKAGO
            </motion.button>
          </div>

          {/* Post URL */}
          <div>
            <label className="font-body text-sm text-foreground mb-2 flex items-center gap-2 font-semibold">
              <LinkIcon className="w-4 h-4" />
              Post URL to Reply To
            </label>
            <div className="relative">
              <input
                value={postUrl}
                onChange={(e) => setPostUrl(e.target.value)}
                placeholder="https://x.com/nakago/status/..."
                className="w-full bg-background/80 border-2 border-border focus:border-primary/50 rounded-xl p-4 text-foreground placeholder:text-muted-foreground/50 transition-all duration-300 focus:shadow-[0_0_30px_hsla(18,100%,50%,0.2)] outline-none font-body"
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
            className="w-full py-5 bg-gradient-naka text-primary-foreground font-display text-lg rounded-full glow-orange hover:glow-orange-intense transition-all flex items-center justify-center gap-3 disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none"
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
