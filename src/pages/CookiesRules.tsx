import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Sparkles, Calendar, Users, ArrowLeft } from "lucide-react";
import ParticleField from "@/components/shared/ParticleField";

const rules = [
  "Create one message that counts, for yourself",
  "Copy the cookies, and fill in your cream",
  "Gather links to your favorite posts",
  "Send a Frame only if more than an hour has passed",
  "Send only one Frame each",
];

const CookiesRules = () => {
  return (
    <div className="relative min-h-screen bg-background overflow-hidden">
      <ParticleField />

      <div className="relative z-10 container mx-auto px-6 py-24 max-w-2xl">
        {/* Back */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <Link to="/app" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-8">
            <ArrowLeft className="w-4 h-4" /> Back to Hub
          </Link>
        </motion.div>

        {/* Header */}
        <motion.div
          className="text-center mb-12"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <h1 className="font-display text-4xl md:text-5xl text-gradient mb-4">
            Cookies 'n' Cream
          </h1>
          <p className="font-body text-muted-foreground text-lg">
            Create meaningful messages for the community
          </p>
        </motion.div>

        {/* Rules */}
        <motion.div
          className="glass-card p-8 mb-8"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <div className="flex items-center gap-3 mb-6">
            <Sparkles className="w-5 h-5 text-primary" />
            <h2 className="font-display text-xl text-foreground">Frame</h2>
          </div>

          <div className="space-y-4">
            {rules.map((rule, i) => (
              <motion.div
                key={i}
                className="flex items-start gap-4 group"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 + i * 0.1 }}
                whileHover={{ x: 4 }}
              >
                <span className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/20 text-primary font-display text-sm flex items-center justify-center">
                  {i + 1}
                </span>
                <p className={`font-body text-foreground/90 pt-1 ${i === 1 ? "text-primary font-semibold" : ""}`}>
                  {rule}
                </p>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Info cards */}
        <motion.div
          className="grid grid-cols-2 gap-4 mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <div className="glass-card p-5 flex items-center gap-3">
            <Calendar className="w-5 h-5 text-neon-cyan" />
            <div>
              <p className="font-body text-sm text-muted-foreground">Full Moon</p>
              <p className="font-display text-foreground text-sm">MUTATE! Mode</p>
            </div>
          </div>
          <div className="glass-card p-5 flex items-center gap-3">
            <Users className="w-5 h-5 text-neon-cyan" />
            <div>
              <p className="font-body text-sm text-muted-foreground">Tend to</p>
              <p className="font-display text-foreground text-sm">The Thread</p>
            </div>
          </div>
        </motion.div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
        >
          <Link to="/cookies/create">
            <motion.button
              className="w-full py-5 bg-gradient-naka text-primary-foreground font-display text-xl rounded-full glow-orange hover:glow-orange-intense transition-all flex items-center justify-center gap-3"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Sparkles className="w-6 h-6" />
              Create Your Cookie
            </motion.button>
          </Link>
        </motion.div>
      </div>
    </div>
  );
};

export default CookiesRules;
