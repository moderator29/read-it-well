import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Sparkles, BookOpen, Ticket, Music, Image, Home, Rocket, ExternalLink, Send, MessageCircle } from "lucide-react";
import ParticleField from "@/components/shared/ParticleField";
import shibaMascot from "@/assets/shiba-mascot.jpeg";

const FULL_CONTRACT = "0x6967b9a8c0b14849CFE8f9E5732B401433fD2898";

const tools = [
  {
    title: "Cookies 'n' Cream",
    description: "Create meaningful messages for the community. Copy the cookies, fill in your cream. 🍪🍦",
    icon: Sparkles,
    href: "/cookies",
    gradient: "from-naka-orange to-naka-red",
    glow: "hover:shadow-[0_0_30px_hsla(18,100%,50%,0.3)]",
    emoji: "🍪",
  },
  {
    title: "M4NGA SBT",
    description: "Mint your Soul Bound Token. Whitelist only. 227 $NAKA + gas to mint.",
    icon: BookOpen,
    href: "/m4nga",
    gradient: "from-purple-500 to-pink-500",
    glow: "hover:shadow-[0_0_30px_hsla(280,100%,50%,0.3)]",
    emoji: "📜",
  },
  {
    title: "NAKA Lottery",
    description: "On chain lottery powered by Chainlink VRF. Coming soon!",
    icon: Ticket,
    href: "/lottery",
    gradient: "from-green-500 to-emerald-500",
    glow: "hover:shadow-[0_0_30px_hsla(140,100%,40%,0.3)]",
    emoji: "🎰",
  },
  {
    title: "Ddergo Records",
    description: "The official Naka Go soundtrack. Vibes, beats, and community energy.",
    icon: Music,
    href: "/ddergo",
    gradient: "from-cyan-500 to-blue-500",
    glow: "hover:shadow-[0_0_30px_hsla(200,100%,50%,0.3)]",
    emoji: "🎵",
  },
  {
    title: "PFP Creator",
    description: "Create your unique Naka Go profile picture. Customize and download!",
    icon: Image,
    href: "/pfp",
    gradient: "from-yellow-500 to-orange-500",
    glow: "hover:shadow-[0_0_30px_hsla(40,100%,50%,0.3)]",
    emoji: "🎨",
  },
];

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.12 } },
};

const item = {
  hidden: { opacity: 0, y: 40, scale: 0.95 },
  show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.5, type: "spring" } },
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
          <Link to="/" className="inline-flex items-center gap-3 mb-4">
            <motion.div whileHover={{ scale: 1.1, rotate: 10 }}>
              <img src={shibaMascot} alt="Naka Go" className="w-14 h-14 rounded-full border-2 border-primary/30 shadow-lg shadow-primary/20" />
            </motion.div>
            <span className="font-display text-2xl text-foreground">NAKA GO</span>
            <span className="font-jp text-lg text-muted-foreground">中号</span>
          </Link>

          <div className="flex items-center justify-center gap-3 mb-2">
            <Link to="/" className="text-muted-foreground hover:text-foreground transition-colors">
              <Home className="w-5 h-5" />
            </Link>
          </div>

          <h1 className="font-display text-4xl md:text-6xl text-gradient mb-4">
            Community Tools
          </h1>
          <p className="font-body text-muted-foreground text-lg max-w-xl mx-auto">
            Create cookies, mint SBTs, play lottery, vibe to music, create PFPs 🍦
          </p>
        </motion.div>

        {/* Spotify Mini Player */}
        <motion.div
          className="max-w-4xl mx-auto mb-10"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <div className="glass-card p-3 overflow-hidden">
            <iframe
              style={{ borderRadius: "12px" }}
              src="https://open.spotify.com/embed/playlist/7i3AcSKszKG5lNrTvBtzD8?utm_source=generator&theme=0"
              width="100%"
              height="152"
              frameBorder="0"
              allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
              loading="lazy"
              title="Ddergo Records"
            />
          </div>
        </motion.div>

        {/* Tool Cards */}
        <motion.div
          className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto"
          variants={container}
          initial="hidden"
          animate="show"
        >
          {tools.map((tool) => (
            <motion.div key={tool.title} variants={item}>
              <Link to={tool.href}>
                <motion.div
                  className={`glass-card p-8 group cursor-pointer ${tool.glow} transition-all duration-300 h-full`}
                  whileHover={{ y: -8 }}
                >
                  <div className="flex items-start justify-between mb-4">
                    <motion.div
                      className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${tool.gradient} flex items-center justify-center group-hover:scale-110 transition-transform`}
                      animate={{ rotate: [0, 5, -5, 0] }}
                      transition={{ duration: 4, repeat: Infinity }}
                    >
                      <tool.icon className="w-7 h-7 text-white" />
                    </motion.div>
                    <span className="text-2xl">{tool.emoji}</span>
                  </div>
                  <h2 className="font-display text-xl text-foreground mb-2">{tool.title}</h2>
                  <p className="font-body text-sm text-muted-foreground leading-relaxed">{tool.description}</p>
                </motion.div>
              </Link>
            </motion.div>
          ))}
        </motion.div>

        {/* Social Links */}
        <motion.div
          className="flex items-center justify-center gap-6 mt-12"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
        >
          <a href="https://t.me/NakaGoInu" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary transition-colors">
            <Send className="w-5 h-5" />
          </a>
          <a href="https://x.com/NakaGoInu" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary transition-colors">
            <MessageCircle className="w-5 h-5" />
          </a>
          <a href={`https://etherscan.io/token/${FULL_CONTRACT}`} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary transition-colors">
            <ExternalLink className="w-5 h-5" />
          </a>
          <motion.a
            href={`https://app.uniswap.org/swap?outputCurrency=${FULL_CONTRACT}&chain=ethereum`}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-gradient-naka text-primary-foreground font-display text-sm px-6 py-2 rounded-full glow-orange inline-flex items-center gap-2"
            whileHover={{ scale: 1.05 }}
          >
            <Rocket className="w-4 h-4" /> Buy $NAKA
          </motion.a>
        </motion.div>
      </div>
    </div>
  );
};

export default AppHub;
