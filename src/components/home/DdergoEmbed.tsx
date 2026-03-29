import { motion } from "framer-motion";
import { Music, ExternalLink } from "lucide-react";

const DdergoEmbed = () => {
  return (
    <section className="py-16 md:py-24 bg-background">
      <div className="container mx-auto px-6 max-w-3xl">
        <motion.div
          className="flex items-center justify-center gap-3 mb-4"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <motion.div
            animate={{ rotate: [0, 10, -10, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <Music className="w-8 h-8 text-primary" />
          </motion.div>
          <h2 className="font-display text-3xl md:text-5xl text-gradient">Ddergo Records</h2>
        </motion.div>
        <motion.p
          className="font-body text-muted-foreground text-center mb-8 text-lg"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1 }}
        >
          The official Naka Go soundtrack. Listen while you vibe 🍦
        </motion.p>

        <motion.div
          className="glass-card p-4 overflow-hidden"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2 }}
        >
          <iframe
            style={{ borderRadius: "12px" }}
            src="https://open.spotify.com/embed/playlist/7i3AcSKszKG5lNrTvBtzD8?utm_source=generator&theme=0"
            width="100%"
            height="352"
            frameBorder="0"
            allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
            loading="lazy"
            title="Ddergo Records Playlist"
          />
        </motion.div>

        <motion.div
          className="text-center mt-4"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3 }}
        >
          <a
            href="https://open.spotify.com/playlist/7i3AcSKszKG5lNrTvBtzD8"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-primary font-body text-sm hover:underline"
          >
            Open in Spotify <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </motion.div>
      </div>
    </section>
  );
};

export default DdergoEmbed;
