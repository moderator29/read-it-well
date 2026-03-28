import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { ArrowLeft, Music, ExternalLink } from "lucide-react";
import ParticleField from "@/components/shared/ParticleField";

const tracks = [
  { title: "Naka Go Theme", artist: "Ddergo", duration: "3:42" },
  { title: "Shiba Dreams", artist: "Ddergo", duration: "4:15" },
  { title: "Akaishi Sunset", artist: "Ddergo", duration: "2:58" },
  { title: "Breed Savior Anthem", artist: "Ddergo", duration: "3:31" },
  { title: "1948 (Interlude)", artist: "Ddergo", duration: "1:47" },
  { title: "Moon Phase", artist: "Ddergo ft. Community", duration: "4:02" },
];

const Ddergo = () => {
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
          <h1 className="font-display text-4xl md:text-6xl text-gradient mb-4">
            Ddergo Records 🍦
          </h1>
          <p className="font-body text-muted-foreground text-lg">
            The official Naka Go playlist. Vibes, beats, and community energy.
          </p>
        </motion.div>

        {/* Spotify Embed — actual NAKA GO playlist */}
        <motion.div
          className="glass-card p-4 mb-8 overflow-hidden"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <iframe
            style={{ borderRadius: "12px" }}
            src="https://open.spotify.com/embed/playlist/3PGFWI7Ms2PHZXbadbfhh4?utm_source=generator&theme=0"
            width="100%"
            height="352"
            frameBorder="0"
            allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
            loading="lazy"
            title="Ddergo Records Playlist"
          />
        </motion.div>

        {/* Track Listing */}
        <motion.div
          className="glass-card p-8"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-display text-2xl text-foreground">Track Listing</h2>
            <a
              href="https://open.spotify.com/playlist/3PGFWI7Ms2PHZXbadbfhh4"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary font-body text-sm inline-flex items-center gap-1 hover:underline"
            >
              Open in Spotify <ExternalLink className="w-3 h-3" />
            </a>
          </div>
          <div className="space-y-1">
            {tracks.map((track, i) => (
              <motion.div
                key={i}
                className="flex items-center gap-4 py-3 px-4 rounded-xl hover:bg-secondary/50 transition-colors group cursor-pointer"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 + i * 0.05 }}
              >
                <span className="font-mono text-muted-foreground text-sm w-6">{i + 1}</span>
                <Music className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                <div className="flex-1">
                  <p className="font-body text-foreground text-sm font-semibold">{track.title}</p>
                  <p className="font-body text-muted-foreground text-xs">{track.artist}</p>
                </div>
                <span className="font-mono text-muted-foreground text-xs">{track.duration}</span>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Ddergo;
