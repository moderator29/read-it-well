import { useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { BookOpen, Wallet, ArrowLeft, Shield, ExternalLink } from "lucide-react";
import ParticleField from "@/components/shared/ParticleField";

const sbtCollection = [
  { id: 1, name: "Genesis Shiba", rarity: "Legendary", minted: 42, image: "🐕" },
  { id: 2, name: "Akaishi Guardian", rarity: "Epic", minted: 128, image: "⛩️" },
  { id: 3, name: "NIPPO Certified", rarity: "Rare", minted: 256, image: "📜" },
  { id: 4, name: "Breed Savior", rarity: "Uncommon", minted: 512, image: "🏆" },
];

const rarityColors: Record<string, string> = {
  Legendary: "text-yellow-400 border-yellow-400/30 bg-yellow-400/10",
  Epic: "text-purple-400 border-purple-400/30 bg-purple-400/10",
  Rare: "text-blue-400 border-blue-400/30 bg-blue-400/10",
  Uncommon: "text-green-400 border-green-400/30 bg-green-400/10",
};

const M4nga = () => {
  const [walletConnected] = useState(false);

  return (
    <div className="relative min-h-screen bg-background overflow-hidden">
      <ParticleField />

      <div className="relative z-10 container mx-auto px-6 py-24 max-w-4xl">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <Link to="/app" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-8">
            <ArrowLeft className="w-4 h-4" /> Back to Hub
          </Link>
        </motion.div>

        <motion.div
          className="text-center mb-12"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="font-display text-4xl md:text-5xl text-gradient mb-4">
            M4NGA — Soul-Bound Tokens
          </h1>
          <p className="font-body text-muted-foreground text-lg max-w-xl mx-auto">
            Non-transferable tokens that live on-chain forever. Your permanent mark in the Naka Go legacy.
          </p>
        </motion.div>

        {/* Connect Wallet CTA */}
        <motion.div
          className="glass-card p-8 mb-10 text-center"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Shield className="w-12 h-12 text-primary mx-auto mb-4" />
          <h2 className="font-display text-2xl text-foreground mb-2">Mint Your SBT</h2>
          <p className="font-body text-muted-foreground mb-6">
            Connect your wallet to mint a Soul-Bound Token. Once minted, it can never be transferred.
          </p>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="bg-gradient-naka text-primary-foreground font-display text-lg px-10 py-4 rounded-full glow-orange hover:glow-orange-intense transition-all inline-flex items-center gap-3"
          >
            <Wallet className="w-5 h-5" />
            {walletConnected ? "Mint SBT" : "Connect Wallet"}
          </motion.button>
          <p className="font-body text-muted-foreground text-xs mt-4">
            Contract: 0x9AA4...FD420{" "}
            <a href="https://etherscan.io/address/0x9AA41B74F3D87c3A27D49736692e70F175eFD420" target="_blank" rel="noopener noreferrer" className="text-primary inline-flex items-center gap-1">
              <ExternalLink className="w-3 h-3" />
            </a>
          </p>
        </motion.div>

        {/* SBT Gallery */}
        <motion.h2
          className="font-display text-2xl text-foreground mb-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          SBT Collection
        </motion.h2>

        <motion.div
          className="grid sm:grid-cols-2 gap-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          {sbtCollection.map((sbt, i) => (
            <motion.div
              key={sbt.id}
              className="glass-card p-6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 + i * 0.1 }}
            >
              <div className="text-5xl mb-4">{sbt.image}</div>
              <h3 className="font-display text-xl text-foreground mb-2">{sbt.name}</h3>
              <div className="flex items-center justify-between">
                <span className={`font-body text-xs px-3 py-1 rounded-full border ${rarityColors[sbt.rarity]}`}>
                  {sbt.rarity}
                </span>
                <span className="font-body text-muted-foreground text-sm">
                  {sbt.minted} minted
                </span>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </div>
  );
};

export default M4nga;
