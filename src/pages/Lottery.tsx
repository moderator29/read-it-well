import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Ticket, Home, Trophy, Wallet, Clock, Zap, Info, Construction } from "lucide-react";
import ParticleField from "@/components/shared/ParticleField";
import { useWallet } from "@/hooks/useWallet";

const Lottery = () => {
  const { shortAddress, connect, disconnect, isConnected } = useWallet();

  return (
    <div className="relative min-h-screen bg-background overflow-hidden">
      <ParticleField />

      <div className="relative z-10 container mx-auto px-6 py-24 max-w-3xl">
        <motion.div className="flex items-center justify-between mb-8" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <Link to="/app" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
            <Home className="w-4 h-4" /> Hub
          </Link>
          {isConnected ? (
            <motion.button
              onClick={disconnect}
              className="font-mono text-xs text-primary border border-primary/30 px-3 py-1.5 rounded-full hover:bg-primary/10 transition-colors"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              {shortAddress}
            </motion.button>
          ) : (
            <motion.button
              onClick={connect}
              className="font-display text-xs text-primary-foreground bg-gradient-naka px-4 py-1.5 rounded-full inline-flex items-center gap-2"
              whileHover={{ scale: 1.05 }}
            >
              <Wallet className="w-3.5 h-3.5" /> Connect
            </motion.button>
          )}
        </motion.div>

        <motion.div
          className="text-center mb-12"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <motion.div
            animate={{ rotate: [0, 15, -15, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="inline-block mb-4"
          >
            <Ticket className="w-12 h-12 text-primary" />
          </motion.div>
          <h1 className="font-display text-4xl md:text-6xl text-gradient mb-4">
            NAKA Lottery
          </h1>
          <p className="font-body text-muted-foreground text-lg">
            On chain lottery powered by Chainlink VRF. Provably fair, fully transparent.
          </p>
        </motion.div>

        {/* Coming Soon Banner */}
        <motion.div
          className="glass-card p-10 text-center mb-8 relative overflow-hidden"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2, type: "spring" }}
        >
          <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent pointer-events-none" />

          <motion.div
            animate={{ y: [0, -8, 0], rotate: [0, 5, -5, 0] }}
            transition={{ duration: 3, repeat: Infinity }}
          >
            <Construction className="w-16 h-16 text-yellow-400 mx-auto mb-4" />
          </motion.div>
          <h2 className="font-display text-3xl text-foreground mb-2">Coming Soon</h2>
          <p className="font-body text-muted-foreground mb-6 max-w-md mx-auto">
            The lottery smart contract is currently under development. Once deployed, you'll be able to buy tickets and win prizes right here!
          </p>

          <div className="flex items-center justify-center gap-2 text-primary">
            <Clock className="w-4 h-4" />
            <span className="font-mono text-sm">Contract deployment pending</span>
          </div>
        </motion.div>

        {/* How It Will Work */}
        <motion.div
          className="glass-card p-8 mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <div className="flex items-center gap-2 mb-6">
            <Info className="w-5 h-5 text-primary" />
            <h2 className="font-display text-2xl text-foreground">How It Will Work</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { icon: Wallet, title: "Connect Wallet", desc: "Connect your Ethereum wallet to participate", emoji: "🔗" },
              { icon: Ticket, title: "Buy Tickets", desc: "Purchase lottery tickets with $NAKA tokens", emoji: "🎫" },
              { icon: Trophy, title: "Win Prizes", desc: "Chainlink VRF ensures provably fair random selection", emoji: "🏆" },
            ].map((step, i) => (
              <motion.div
                key={step.title}
                className="glass-card p-5 text-center"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 + i * 0.1 }}
              >
                <motion.div
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ duration: 2, repeat: Infinity, delay: i * 0.3 }}
                >
                  <span className="text-3xl block mb-2">{step.emoji}</span>
                </motion.div>
                <step.icon className="w-6 h-6 text-primary mx-auto mb-2" />
                <p className="font-display text-sm text-foreground mb-1">{step.title}</p>
                <p className="font-body text-xs text-muted-foreground">{step.desc}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Powered by */}
        <motion.div
          className="text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
        >
          <div className="flex items-center justify-center gap-2 text-muted-foreground">
            <Zap className="w-4 h-4 text-green-400" />
            <span className="font-body text-sm">Powered by Chainlink VRF</span>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Lottery;
