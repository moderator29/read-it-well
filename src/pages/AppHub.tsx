import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Sparkles, BookOpen, Ticket, Music } from "lucide-react";
import ParticleField from "@/components/shared/ParticleField";

const tools = [
  {
    title: "Cookies 'n' Cream",
    description: "Create meaningful messages for the community. Copy the cookies, fill in your cream.",
    icon: Sparkles,
    href: "/cookies",
    gradient: "from-naka-orange to-naka-red",
    glow: "shadow-[0_0_30px_hsla(18,100%,50%,0.3)]",
  },
  {
    title: "M4NGA",
    description: "Mint your Soul-Bound Token. A permanent mark on the blockchain, tied to your identity.",
    icon: BookOpen,
    href: "/m4nga",
    gradient: "from-purple-500 to-pink-500",
    glow: "shadow-[0_0_30px_hsla(280,100%,50%,0.3)]",
  },
  {
    title: "Lottery",
    description: "Enter the on-chain lottery powered by Chainlink VRF. Buy tickets, win the jackpot.",
    icon: Ticket,
    href: "/lottery",
    gradient: "from-green-500 to-emerald-500",
    glow: "shadow-[0_0_30px_hsla(140,100%,40%,0.3)]",
  },
  {
    title: "Ddergo Records",
    description: "The official Naka Go soundtrack. Vibes, beats, and community energy.",
    icon: Music,
    href: "/ddergo",
    gradient: "from-cyan-500 to-blue-500",
    glow: "shadow-[0_0_30px_hsla(200,100%,50%,0.3)]",
  },
];

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.15 } },
};

const item = {
  hidden: { opacity: 0, y: 40 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6 } },
};

const AppHub = () => {
  return (
    <div className="relative min-h-screen bg-background overflow-hidden">
      <ParticleField />

      <div className="relative z-10 container mx-auto px-6 py-24">
        {/* Header */}
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <Link to="/" className="inline-block mb-8">
            <span className="font-display text-2xl text-foreground">NAKA GO</span>
            <span className="font-jp text-lg text-muted-foreground ml-2">中号</span>
          </Link>
          <h1 className="font-display text-4xl md:text-6xl text-gradient mb-4">
            Community Tools
          </h1>
          <p className="font-body text-muted-foreground text-lg max-w-xl mx-auto">
            The interactive hub of the Naka Go ecosystem. Create, mint, win, and vibe.
          </p>
        </motion.div>

        {/* Tool Cards */}
        <motion.div
          className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto"
          variants={container}
          initial="hidden"
          animate="show"
        >
          {tools.map((tool) => (
            <motion.div key={tool.title} variants={item}>
              <Link to={tool.href}>
                <div className={`glass-card p-8 group cursor-pointer hover:${tool.glow}`}>
                  <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${tool.gradient} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}>
                    <tool.icon className="w-7 h-7 text-white" />
                  </div>
                  <h2 className="font-display text-2xl text-foreground mb-3">{tool.title}</h2>
                  <p className="font-body text-muted-foreground leading-relaxed">{tool.description}</p>
                </div>
              </Link>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </div>
  );
};

export default AppHub;
