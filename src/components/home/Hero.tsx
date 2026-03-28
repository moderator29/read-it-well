import { motion } from "framer-motion";
import { ChevronDown } from "lucide-react";
import shibaHero from "@/assets/shiba-hero.png";
import ParticleField from "@/components/shared/ParticleField";

const Hero = () => {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-background">
      <ParticleField />

      <div className="relative z-10 container mx-auto px-6 flex flex-col items-center text-center">
        {/* Logo */}
        <motion.div
          className="flex items-center gap-3 mb-6"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          <span className="font-display text-4xl md:text-5xl text-foreground">NAKA GO</span>
          <span className="font-jp text-2xl md:text-3xl text-muted-foreground">中号</span>
        </motion.div>

        {/* Shiba mascot */}
        <motion.div
          className="relative w-64 h-64 md:w-96 md:h-96 mb-8 rounded-full overflow-hidden"
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          style={{
            boxShadow: "0 0 60px hsla(18, 100%, 50%, 0.4), 0 0 120px hsla(18, 100%, 50%, 0.15)",
          }}
        >
          <img
            src={shibaHero}
            alt="Naka Go - The legendary Shiba Inu"
            width={1024}
            height={1024}
            className="w-full h-full object-cover"
          />
        </motion.div>

        {/* Headline */}
        <motion.h1
          className="font-display text-3xl md:text-5xl lg:text-6xl text-gradient mb-6 max-w-3xl leading-tight"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.6 }}
          style={{ textShadow: "0 0 20px hsla(18, 100%, 50%, 0.5)" }}
        >
          The Shiba Who Saved His Breed
        </motion.h1>

        {/* Description */}
        <motion.p
          className="font-body text-base md:text-lg text-muted-foreground max-w-xl mb-10 leading-relaxed"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.8 }}
        >
          Born 1948. Survived WWII. Became the genetic foundation of 80% of modern Shiba Inus. This is his story.
        </motion.p>

        {/* CTAs */}
        <motion.div
          className="flex flex-col sm:flex-row gap-4"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 1 }}
        >
          <motion.a
            href="https://app.uniswap.org"
            target="_blank"
            rel="noopener noreferrer"
            className="bg-gradient-naka text-primary-foreground font-display text-lg px-10 py-4 rounded-full glow-orange inline-block"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            Buy $NAKA
          </motion.a>
          <motion.a
            href="#about"
            className="border-2 border-primary text-primary font-display text-lg px-10 py-4 rounded-full inline-block hover:bg-primary hover:text-primary-foreground transition-colors"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            Read the Story
          </motion.a>
        </motion.div>

        {/* Scroll indicator */}
        <motion.div
          className="absolute bottom-8 left-1/2 -translate-x-1/2"
          initial={{ opacity: 1 }}
          animate={{ y: [0, 10, 0], opacity: [1, 1, 0] }}
          transition={{
            y: { duration: 1.5, repeat: Infinity },
            opacity: { duration: 3, delay: 3 },
          }}
        >
          <ChevronDown className="w-8 h-8 text-muted-foreground" />
        </motion.div>
      </div>
    </section>
  );
};

export default Hero;
