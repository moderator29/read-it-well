import { useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Sparkles, Home, Plus, ExternalLink, ChevronLeft, ChevronRight, Copy, Check } from "lucide-react";
import ParticleField from "@/components/shared/ParticleField";

const communityPosts = [
  {
    text: "🍪 Create one message that counts, for yourself\n\n🍦 Frens are for memories\n\n🍪 Copy the cookies, and fill in your cream\n#NAKAGO 🍪🍦",
    author: "2021Eyezen",
    handle: "@2021Eyezen",
    date: "September 3, 2025",
  },
  {
    text: "🍪 Create one message that counts, for yourself\n\n🍦 Building in public, one step at a time\n\n🍪 Copy the cookies, and fill in your cream\n#NAKAGO 🍪🍦",
    author: "NakaGoInu",
    handle: "@NakaGoInu",
    date: "September 5, 2025",
  },
  {
    text: "🍪 Create one message that counts, for yourself\n\n🍦 Diamond hands, golden heart\n\n🍪 Copy the cookies, and fill in your cream\n#NAKAGO 🍪🍦",
    author: "x_mammal",
    handle: "@x_mammal",
    date: "September 3, 2025",
  },
];

const CookiesRules = () => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [copiedPost, setCopiedPost] = useState<number | null>(null);

  const handleCopyPost = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedPost(index);
    setTimeout(() => setCopiedPost(null), 2000);
  };

  return (
    <div className="relative min-h-screen bg-background overflow-hidden">
      <ParticleField />

      <div className="relative z-10 container mx-auto px-6 py-24 max-w-2xl">
        <motion.div className="flex items-center justify-between mb-8" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <Link to="/app" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
            <Home className="w-4 h-4" /> Hub
          </Link>
          <Link to="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors text-sm">
            <Home className="w-3.5 h-3.5" /> Home
          </Link>
        </motion.div>

        <motion.div
          className="text-center mb-10"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <motion.div animate={{ rotate: [0, 10, -10, 0] }} transition={{ duration: 3, repeat: Infinity }} className="inline-block mb-3">
            <Sparkles className="w-10 h-10 text-primary" />
          </motion.div>
          <h1 className="font-display text-3xl md:text-5xl text-foreground mb-2">
            🍪 Cookies 'n' Cream 🍦
          </h1>
          <p className="font-body text-muted-foreground text-base max-w-md mx-auto">
            Create meaningful messages with our special cookie frame format. Share your thoughts and spread positivity!
          </p>
        </motion.div>

        {/* Create Cookie CTA */}
        <motion.div className="mb-10" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Link to="/cookies/create">
            <motion.button
              className="w-full max-w-sm mx-auto block py-5 px-8 bg-gradient-naka text-primary-foreground font-display text-xl rounded-2xl glow-orange transition-all flex items-center justify-center gap-3"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Plus className="w-6 h-6" />
              🍪 Create Cookie 🍦
            </motion.button>
          </Link>
        </motion.div>

        {/* Community Cookies Carousel */}
        <motion.div className="mb-10" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <h2 className="font-display text-2xl text-foreground mb-6">🍪 Cookies added to our story</h2>

          <div className="relative">
            <div className="overflow-hidden">
              <motion.div
                className="flex gap-4"
                animate={{ x: `-${currentSlide * 100}%` }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
              >
                {communityPosts.map((post, i) => (
                  <div key={i} className="min-w-full">
                    <div className="glass-card p-6">
                      <p className="font-body text-foreground/90 whitespace-pre-line text-sm leading-relaxed mb-4">
                        {post.text}
                      </p>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-body text-muted-foreground text-xs">{post.author} ({post.handle})</p>
                          <p className="font-body text-muted-foreground text-xs">{post.date}</p>
                        </div>
                        <motion.button
                          onClick={() => handleCopyPost(post.text, i)}
                          className="text-muted-foreground hover:text-primary transition-colors"
                          whileTap={{ scale: 0.9 }}
                        >
                          {copiedPost === i ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                        </motion.button>
                      </div>
                    </div>
                  </div>
                ))}
              </motion.div>
            </div>

            <div className="flex items-center justify-between mt-4">
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={() => setCurrentSlide(Math.max(0, currentSlide - 1))}
                className="w-10 h-10 rounded-lg border border-border flex items-center justify-center text-foreground hover:border-primary/50 transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
              </motion.button>
              <div className="flex gap-2">
                {communityPosts.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrentSlide(i)}
                    className={`w-2.5 h-2.5 rounded-full transition-colors ${i === currentSlide ? "bg-primary" : "bg-muted-foreground/30"}`}
                  />
                ))}
              </div>
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={() => setCurrentSlide(Math.min(communityPosts.length - 1, currentSlide + 1))}
                className="w-10 h-10 rounded-lg border border-border flex items-center justify-center text-foreground hover:border-primary/50 transition-colors"
              >
                <ChevronRight className="w-5 h-5" />
              </motion.button>
            </div>
          </div>
        </motion.div>

        {/* Track on X */}
        <motion.div className="text-center space-y-3" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
          <a
            href="https://x.com/search?q=%23NAKAGO&f=live"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-lg border border-border text-foreground font-body text-sm hover:border-primary/50 transition-colors"
          >
            <ExternalLink className="w-4 h-4" />
            🍪 Track Cookies on X
          </a>
        </motion.div>
      </div>
    </div>
  );
};

export default CookiesRules;
