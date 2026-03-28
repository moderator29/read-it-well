import { useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Ticket, ArrowLeft, Trophy, Wallet, Minus, Plus } from "lucide-react";
import ParticleField from "@/components/shared/ParticleField";

const pastWinners = [
  { address: "0x7a3f...8e21", prize: "2.5 ETH", date: "Mar 15, 2026" },
  { address: "0x4b2c...1f09", prize: "1.8 ETH", date: "Mar 8, 2026" },
  { address: "0x9d1e...3c47", prize: "3.2 ETH", date: "Mar 1, 2026" },
];

const Lottery = () => {
  const [ticketCount, setTicketCount] = useState(1);
  const ticketPrice = 0.01;
  const prizePool = 12.45;

  return (
    <div className="relative min-h-screen bg-background overflow-hidden">
      <ParticleField />

      <div className="relative z-10 container mx-auto px-6 py-24 max-w-3xl">
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
            NAKA Lottery
          </h1>
          <p className="font-body text-muted-foreground text-lg">
            On-chain lottery powered by Chainlink VRF. Provably fair, fully transparent.
          </p>
        </motion.div>

        {/* Prize Pool */}
        <motion.div
          className="glass-card p-10 text-center mb-8"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
        >
          <Trophy className="w-14 h-14 text-yellow-400 mx-auto mb-4" />
          <p className="font-body text-muted-foreground text-sm mb-2">Current Prize Pool</p>
          <motion.p
            className="font-display text-5xl md:text-6xl text-gradient"
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", delay: 0.4 }}
          >
            {prizePool} ETH
          </motion.p>
          <p className="font-body text-muted-foreground text-sm mt-2">≈ ${(prizePool * 3200).toLocaleString()}</p>
        </motion.div>

        {/* Buy Tickets */}
        <motion.div
          className="glass-card p-8 mb-8"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <h2 className="font-display text-2xl text-foreground mb-6 text-center">Buy Tickets</h2>

          <div className="flex items-center justify-center gap-6 mb-6">
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => setTicketCount(Math.max(1, ticketCount - 1))}
              className="w-12 h-12 rounded-full bg-secondary text-foreground flex items-center justify-center hover:bg-secondary/80 transition-colors"
            >
              <Minus className="w-5 h-5" />
            </motion.button>
            <span className="font-display text-4xl text-foreground w-20 text-center">{ticketCount}</span>
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => setTicketCount(Math.min(100, ticketCount + 1))}
              className="w-12 h-12 rounded-full bg-secondary text-foreground flex items-center justify-center hover:bg-secondary/80 transition-colors"
            >
              <Plus className="w-5 h-5" />
            </motion.button>
          </div>

          <p className="font-body text-center text-muted-foreground mb-6">
            Total: <span className="text-foreground font-semibold">{(ticketCount * ticketPrice).toFixed(3)} ETH</span>
            <span className="text-muted-foreground text-sm"> ({ticketPrice} ETH/ticket)</span>
          </p>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="w-full py-5 bg-gradient-naka text-primary-foreground font-display text-lg rounded-full glow-orange hover:glow-orange-intense transition-all flex items-center justify-center gap-3"
          >
            <Wallet className="w-5 h-5" />
            Connect Wallet to Buy
          </motion.button>
        </motion.div>

        {/* Past Winners */}
        <motion.div
          className="glass-card p-8"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <h2 className="font-display text-2xl text-foreground mb-6">Past Winners</h2>
          <div className="space-y-4">
            {pastWinners.map((winner, i) => (
              <div key={i} className="flex items-center justify-between py-3 border-b border-border last:border-0">
                <div className="flex items-center gap-3">
                  <span className="text-xl">{i === 0 ? "🥇" : i === 1 ? "🥈" : "🥉"}</span>
                  <span className="font-mono text-foreground text-sm">{winner.address}</span>
                </div>
                <div className="text-right">
                  <p className="font-display text-primary text-sm">{winner.prize}</p>
                  <p className="font-body text-muted-foreground text-xs">{winner.date}</p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Lottery;
