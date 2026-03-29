import { motion } from "framer-motion";
import { TrendingUp, BarChart3, Users, Clock, Rocket, Droplets, Layers } from "lucide-react";

const FULL_CONTRACT = "0x6967b9a8c0b14849CFE8f9E5732B401433fD2898";

const keyStats = [
  { icon: Droplets, label: "Liquidity", value: "LP Burnt", color: "text-green-400" },
  { icon: Layers, label: "Supply", value: "1,000,000,000", color: "text-foreground" },
  { icon: BarChart3, label: "Tax", value: "0/0", color: "text-green-400" },
  { icon: Users, label: "Holders", value: "Growing", color: "text-primary" },
  { icon: Clock, label: "Network", value: "Ethereum", color: "text-blue-400" },
  { icon: TrendingUp, label: "Status", value: "Live", color: "text-green-400" },
];

const TradingChart = () => {
  return (
    <section className="py-16 md:py-24 bg-secondary/30">
      <div className="container mx-auto px-6 max-w-5xl">
        <motion.div
          className="flex items-center justify-center gap-3 mb-4"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 2, repeat: Infinity }}>
            <TrendingUp className="w-8 h-8 text-primary" />
          </motion.div>
          <h2 className="font-display text-3xl md:text-5xl text-gradient">Live Chart</h2>
        </motion.div>
        <motion.p
          className="font-body text-muted-foreground text-center mb-8 text-lg"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1 }}
        >
          Real time $NAKA price action on Ethereum
        </motion.p>

        {/* DexScreener embed */}
        <motion.div
          className="glass-card p-2 md:p-4 overflow-hidden mb-8"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2 }}
        >
          <iframe
            src={`https://dexscreener.com/ethereum/${FULL_CONTRACT}?embed=1&theme=dark&trades=0&info=0`}
            width="100%"
            height="450"
            frameBorder="0"
            style={{ borderRadius: "12px" }}
            loading="lazy"
            title="$NAKA Chart"
          />
        </motion.div>

        {/* Key Stats Grid */}
        <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
          {keyStats.map((stat, i) => (
            <motion.div
              key={stat.label}
              className="glass-card p-4 text-center"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 * i + 0.3 }}
            >
              <motion.div
                animate={{ rotate: [0, 5, -5, 0] }}
                transition={{ duration: 3, repeat: Infinity, delay: i * 0.2 }}
              >
                <stat.icon className="w-5 h-5 text-primary mx-auto mb-2" />
              </motion.div>
              <p className="font-body text-[10px] text-muted-foreground mb-1">{stat.label}</p>
              <p className={`font-display text-xs ${stat.color}`}>{stat.value}</p>
            </motion.div>
          ))}
        </div>

        {/* Buy Button */}
        <motion.div
          className="text-center mt-8"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.5 }}
        >
          <motion.a
            href={`https://app.uniswap.org/swap?outputCurrency=${FULL_CONTRACT}&chain=ethereum`}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-gradient-naka text-primary-foreground font-display text-xl px-16 py-5 rounded-full glow-orange inline-flex items-center gap-3"
            whileHover={{ scale: 1.05, boxShadow: "0 0 50px hsla(18, 100%, 50%, 0.8)" }}
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

export default TradingChart;
