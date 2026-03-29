import { motion } from "framer-motion";
import { ExternalLink, Send, MessageCircle, BookOpen, Rocket } from "lucide-react";

const FULL_CONTRACT = "0x6967b9a8c0b14849CFE8f9E5732B401433fD2898";

const socials = [
  { label: "Telegram", url: "https://t.me/NakaGoInu", icon: Send },
  { label: "X / Twitter", url: "https://x.com/NakaGoInu", icon: MessageCircle },
  { label: "Medium", url: "https://x.com/N4kaishi8a/status/1959984583665230297", icon: BookOpen },
  { label: "Etherscan", url: `https://etherscan.io/token/${FULL_CONTRACT}`, icon: ExternalLink },
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
          Join the Community 🍦
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
              className="glass-card p-5 flex flex-col items-center gap-3 group"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              whileHover={{ scale: 1.08, y: -5 }}
            >
              <motion.div
                animate={{ rotate: [0, 10, -10, 0] }}
                transition={{ duration: 3, repeat: Infinity, delay: i * 0.3 }}
              >
                <s.icon className="w-7 h-7 text-primary" />
              </motion.div>
              <span className="font-body text-sm text-foreground font-semibold">{s.label}</span>
            </motion.a>
          ))}
        </div>

        {/* Henk Bot */}
        <motion.a
          href="https://t.me/cookies_and_cream_monster_bot"
          target="_blank"
          rel="noopener noreferrer"
          className="glass-card p-5 inline-flex items-center gap-3 mb-10"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3 }}
          whileHover={{ scale: 1.05 }}
        >
          <span className="text-2xl">👑</span>
          <div className="text-left">
            <p className="font-display text-sm text-foreground">Henk (King of Lore)</p>
            <p className="font-body text-xs text-muted-foreground">@cookies_and_cream_monster_bot</p>
          </div>
          <ExternalLink className="w-4 h-4 text-muted-foreground" />
        </motion.a>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.4 }}
        >
          <motion.a
            href={`https://app.uniswap.org/swap?outputCurrency=${FULL_CONTRACT}&chain=ethereum`}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-gradient-naka text-primary-foreground font-display text-xl px-12 py-5 rounded-full glow-orange inline-flex items-center gap-3"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Rocket className="w-6 h-6" />
            Buy $NAKA
          </motion.a>
        </motion.div>
      </div>
    </section>
  );
};

export default Community;
