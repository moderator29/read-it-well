import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Home, Music, ExternalLink, Headphones, Disc } from "lucide-react";
import ParticleField from "@/components/shared/ParticleField";

const Ddergo = () => {
  return (
    <div className="relative min-h-screen bg-background overflow-hidden">
      <ParticleField />

      <div className="relative z-10 container mx-auto px-6 py-24 max-w-3xl">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <Link to="/app" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-8">
            <Home className="w-4 h-4" /> Hub
          </Link>
        </motion.div>

        <motion.div
          className="text-center mb-12"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <motion.div
            animate={{ rotate: [0, 360] }}
            transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
            className="inline-block mb-4"
          >
            <Disc className="w-14 h-14 text-primary" />
          </motion.div>
          <h1 className="font-display text-4xl md:text-6xl text-gradient mb-4">
            Ddergo Records 🎵
          </h1>
          <p className="font-body text-muted-foreground text-lg">
            The official Naka Go playlist. Vibes, beats, and community energy.
          </p>
        </motion.div>

        {/* Full Spotify Embed */}
        <motion.div
          className="glass-card p-4 mb-8 overflow-hidden"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <iframe
            style={{ borderRadius: "12px" }}
            src="https://open.spotify.com/embed/playlist/7i3AcSKszKG5lNrTvBtzD8?utm_source=generator&theme=0"
            width="100%"
            height="500"
            frameBorder="0"
            allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
            loading="lazy"
            title="Ddergo Records Playlist"
          />
        </motion.div>

        {/* Open in Spotify */}
        <motion.div
          className="text-center mb-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          <motion.a
            href="https://open.spotify.com/playlist/7i3AcSKszKG5lNrTvBtzD8"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-3 px-8 py-4 bg-[#1DB954] text-white font-display text-lg rounded-full"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Headphones className="w-5 h-5" />
            Open Full Playlist
            <ExternalLink className="w-4 h-4" />
          </motion.a>
        </motion.div>

        {/* Vibes section */}
        <motion.div
          className="glass-card p-8 text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <div className="flex items-center justify-center gap-3 mb-4">
            <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 1.5, repeat: Infinity }}>
              <Music className="w-6 h-6 text-primary" />
            </motion.div>
            <h2 className="font-display text-xl text-foreground">Community Vibes</h2>
          </div>
          <p className="font-body text-muted-foreground text-sm max-w-md mx-auto">
            The soundtrack to the Naka Go movement. Every beat tells a story. Every track is a vibe. Hit play and feel the energy 🍦
          </p>
        </motion.div>
      </div>
    </div>
  );
};

export default Ddergo;
