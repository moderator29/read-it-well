import { motion } from "framer-motion";
import { ExternalLink } from "lucide-react";

const socials = [
  { label: "Telegram", url: "https://t.me/NakaGoCult", emoji: "💬" },
  { label: "𝕏 / Twitter", url: "https://x.com/NakaGoInu", emoji: "🐦" },
  { label: "Medium", url: "https://medium.com/@NakaGo", emoji: "📝" },
  { label: "Etherscan", url: "https://etherscan.io", emoji: "🔗" },
];

const Community = () => {
  return (
    <section id="community" className="py-24 md:py-32 bg-secondary/30">
      <div className="container mx-auto px-6 max-w-3xl text-center">
        <motion.h2
          className="font-display text-3xl md:text-5xl text-gradient mb-4"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          Join the Cult 🍦
        </motion.h2>
        <motion.p
          className="font-body text-muted-foreground mb-16 text-lg"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1 }}
        >
          We make art now.
        </motion.p>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-16">
          {socials.map((s, i) => (
            <motion.a
              key={s.label}
              href={s.url}
              target="_blank"
              rel="noopener noreferrer"
              className="glass-card p-5 flex flex-col items-center gap-2 group"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              whileHover={{ scale: 1.05 }}
            >
              <span className="text-2xl">{s.emoji}</span>
              <span className="font-body text-sm text-foreground font-semibold">{s.label}</span>
              <ExternalLink className="w-3 h-3 text-muted-foreground group-hover:text-primary transition-colors" />
            </motion.a>
          ))}
        </div>

        {/* CTA */}
        <motion.a
          href="https://app.uniswap.org"
          target="_blank"
          rel="noopener noreferrer"
          className="bg-gradient-naka text-primary-foreground font-display text-xl px-12 py-5 rounded-full glow-orange inline-block"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          Buy $NAKA
        </motion.a>
      </div>
    </section>
  );
};

export default Community;
