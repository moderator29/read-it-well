import { useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { BookOpen, Wallet, Home, Shield, ExternalLink, Sparkles, Lock, AlertTriangle } from "lucide-react";
import ParticleField from "@/components/shared/ParticleField";
import { useWallet } from "@/hooks/useWallet";

const MINT_PRICE = 227; // NAKA tokens

const M4nga = () => {
  const { address, shortAddress, isConnecting, connect, disconnect, isConnected } = useWallet();
  const [isMinting, setIsMinting] = useState(false);

  const handleMint = async () => {
    if (!isConnected) {
      connect();
      return;
    }
    setIsMinting(true);
    // Placeholder: actual mint would call smart contract
    setTimeout(() => {
      setIsMinting(false);
      alert("Minting requires whitelist approval. Please ensure your wallet is whitelisted.");
    }, 2000);
  };

  return (
    <div className="relative min-h-screen bg-background overflow-hidden">
      <ParticleField />

      <div className="relative z-10 container mx-auto px-6 py-24 max-w-3xl">
        <motion.div className="flex items-center justify-between mb-8" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <Link to="/app" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
            <Home className="w-4 h-4" /> Hub
          </Link>
          {isConnected && (
            <motion.button
              onClick={disconnect}
              className="font-mono text-xs text-primary border border-primary/30 px-3 py-1.5 rounded-full hover:bg-primary/10 transition-colors"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              {shortAddress}
            </motion.button>
          )}
        </motion.div>

        <motion.div
          className="text-center mb-12"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <motion.div
            animate={{ rotate: [0, 5, -5, 0] }}
            transition={{ duration: 3, repeat: Infinity }}
            className="inline-block mb-4"
          >
            <BookOpen className="w-12 h-12 text-primary mx-auto" />
          </motion.div>
          <h1 className="font-display text-4xl md:text-6xl text-gradient mb-4">
            M4NGA SBT
          </h1>
          <p className="font-body text-muted-foreground text-lg max-w-xl mx-auto">
            Soul Bound Tokens that live on chain forever. Whitelist only. Your permanent mark in the Naka Go legacy.
          </p>
        </motion.div>

        {/* Whitelist Notice */}
        <motion.div
          className="glass-card p-6 mb-8 flex items-start gap-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <motion.div animate={{ scale: [1, 1.1, 1] }} transition={{ duration: 2, repeat: Infinity }}>
            <Lock className="w-8 h-8 text-yellow-400 shrink-0 mt-1" />
          </motion.div>
          <div>
            <h3 className="font-display text-lg text-foreground mb-1">Whitelist Only</h3>
            <p className="font-body text-sm text-muted-foreground">
              M4NGA SBTs are exclusive to whitelisted wallets. Connect your wallet to check eligibility. Once minted, the token is bound to your identity forever and cannot be transferred.
            </p>
          </div>
        </motion.div>

        {/* Mint Interface */}
        <motion.div
          className="glass-card p-8 mb-8 text-center relative overflow-hidden"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent pointer-events-none" />

          <motion.div animate={{ y: [0, -5, 0] }} transition={{ duration: 3, repeat: Infinity }}>
            <Shield className="w-16 h-16 text-primary mx-auto mb-4" />
          </motion.div>
          <h2 className="font-display text-3xl text-foreground mb-2">Mint Your SBT</h2>
          
          <div className="glass-card p-4 inline-block mb-6 mt-4">
            <p className="font-body text-sm text-muted-foreground mb-1">Mint Price</p>
            <p className="font-display text-2xl text-gradient">{MINT_PRICE} $NAKA</p>
            <p className="font-body text-xs text-muted-foreground mt-1">+ gas fees</p>
          </div>

          <div className="mb-6">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleMint}
              disabled={isMinting}
              className="bg-gradient-naka text-primary-foreground font-display text-lg px-10 py-4 rounded-full glow-orange transition-all inline-flex items-center gap-3 disabled:opacity-50"
            >
              <Wallet className="w-5 h-5" />
              {isMinting ? "Checking Whitelist..." : isConnected ? "Mint SBT (227 $NAKA)" : "Connect Wallet"}
            </motion.button>
          </div>

          {isConnected && (
            <motion.div
              className="flex items-center justify-center gap-2 text-yellow-400"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <AlertTriangle className="w-4 h-4" />
              <p className="font-body text-xs">Whitelist verification required before minting</p>
            </motion.div>
          )}

          <div className="mt-4 flex items-center justify-center gap-2">
            <p className="font-mono text-muted-foreground text-xs">
              Contract: 0x9AA4...FD420
            </p>
            <a
              href="https://etherscan.io/address/0x9AA41B74F3D87c3A27D49736692e70F175eFD420"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:text-primary/80"
            >
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </motion.div>

        {/* How It Works */}
        <motion.div
          className="glass-card p-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <div className="flex items-center gap-2 mb-6">
            <Sparkles className="w-5 h-5 text-primary" />
            <h2 className="font-display text-2xl text-foreground">How It Works</h2>
          </div>
          <div className="space-y-4">
            {[
              { step: "1", title: "Get Whitelisted", desc: "Join the community and get your wallet whitelisted by the team" },
              { step: "2", title: "Connect Wallet", desc: "Connect your whitelisted Ethereum wallet" },
              { step: "3", title: "Approve 227 $NAKA", desc: "Approve the token spend of 227 $NAKA from your wallet" },
              { step: "4", title: "Mint Your SBT", desc: "Your Soul Bound Token is minted forever on chain" },
            ].map((s, i) => (
              <motion.div
                key={s.step}
                className="flex items-start gap-4"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.6 + i * 0.1 }}
              >
                <div className="w-8 h-8 rounded-full bg-gradient-naka flex items-center justify-center text-primary-foreground font-display text-sm shrink-0">
                  {s.step}
                </div>
                <div>
                  <p className="font-display text-sm text-foreground">{s.title}</p>
                  <p className="font-body text-xs text-muted-foreground">{s.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default M4nga;
