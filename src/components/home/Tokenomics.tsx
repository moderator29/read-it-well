import { motion } from "framer-motion";
import { ShieldCheck, Zap, Flame, Users, Copy } from "lucide-react";
import { useState } from "react";

const badges = [
  { icon: ShieldCheck, title: "Renounced", desc: "Contract ownership renounced forever" },
  { icon: Zap, title: "0/0 Tax", desc: "Zero buy tax. Zero sell tax. Ever." },
  { icon: Flame, title: "LP Burnt", desc: "100% liquidity burned. Rug-proof." },
  { icon: Users, title: "Fair Launch", desc: "No presale. No team allocation. Pure community." },
];

const Tokenomics = () => {
  const [copied, setCopied] = useState(false);
  const contractAddress = "0x..."; // TBD

  const handleCopy = () => {
    navigator.clipboard.writeText(contractAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <section id="tokenomics" className="py-24 md:py-32 bg-background">
      <div className="container mx-auto px-6 max-w-4xl">
        <motion.h2
          className="font-display text-3xl md:text-5xl text-gradient text-center mb-4"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          Tokenomics
        </motion.h2>
        <motion.p
          className="font-display text-lg md:text-2xl text-foreground text-center mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1 }}
        >
          Fair Launch. Zero Tax. 100% Community.
        </motion.p>

        {/* Contract Address */}
        <motion.div
          className="glass-card p-6 mb-12 flex flex-col sm:flex-row items-center justify-between gap-4"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2 }}
        >
          <div>
            <span className="text-xs text-muted-foreground font-body block mb-1">Contract Address</span>
            <span className="font-mono text-sm text-foreground break-all">{contractAddress}</span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleCopy}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-secondary text-secondary-foreground text-sm font-body hover:bg-secondary/80 transition-colors"
            >
              <Copy size={14} />
              {copied ? "Copied!" : "Copy"}
            </button>
            <a
              href="https://etherscan.io"
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 rounded-lg bg-gradient-naka text-primary-foreground text-sm font-body"
            >
              Etherscan
            </a>
          </div>
        </motion.div>

        {/* Trust Badges */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {badges.map((badge, i) => (
            <motion.div
              key={badge.title}
              className="glass-card p-5 text-center"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 * i + 0.3 }}
            >
              <badge.icon className="w-8 h-8 text-primary mx-auto mb-3" />
              <h3 className="font-display text-sm text-foreground mb-1">{badge.title}</h3>
              <p className="text-xs text-muted-foreground font-body">{badge.desc}</p>
            </motion.div>
          ))}
        </div>

        {/* Supply info */}
        <motion.div
          className="mt-12 text-center"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.5 }}
        >
          <p className="font-body text-sm text-muted-foreground mb-2">Total Supply</p>
          <p className="font-display text-4xl md:text-6xl text-gradient">1,000,000,000</p>
          <p className="font-display text-lg text-primary mt-1">$NAKA</p>
        </motion.div>
      </div>
    </section>
  );
};

export default Tokenomics;
