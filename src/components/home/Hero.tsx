import { motion } from "framer-motion";
import { ChevronDown, Copy, Check, Rocket, TrendingUp } from "lucide-react";
import { useState } from "react";
import shibaMascot from "@/assets/shiba-mascot.jpeg";
import stickerGoUp from "@/assets/sticker-go-up.png";
import stickerMoon from "@/assets/sticker-moon.png";
import stickerHodl from "@/assets/sticker-hodl.png";
import stickerGm from "@/assets/sticker-gm.png";
import ParticleField from "@/components/shared/ParticleField";

const FULL_CONTRACT = "0x6967b9a8c0b14849CFE8f9E5732B401433fD2898";
const SHORT_CONTRACT = "0x6967...2898";

const Hero = () => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(FULL_CONTRACT);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-background">
      <ParticleField />

      {/* Radial glow */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-[600px] h-[600px] rounded-full bg-primary/10 blur-[120px]" />
      </div>

      {/* Floating stickers */}
      <motion.img
        src={stickerGoUp}
        alt="NAKA GO UP"
        className="absolute top-20 left-4 md:left-20 w-24 md:w-36 pointer-events-none z-20 drop-shadow-2xl"
        loading="lazy" width={512} height={512}
        animate={{ y: [0, -15, 0], rotate: [-5, 5, -5] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.img
        src={stickerMoon}
        alt="NAKA MOON"
        className="absolute top-32 right-4 md:right-20 w-24 md:w-36 pointer-events-none z-20 drop-shadow-2xl"
        loading="lazy" width={512} height={512}
        animate={{ y: [0, -20, 0], rotate: [5, -5, 5] }}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
      />
      <motion.img
        src={stickerHodl}
        alt="HODL"
        className="absolute bottom-40 left-4 md:left-24 w-20 md:w-28 pointer-events-none z-20 drop-shadow-2xl"
        loading="lazy" width={512} height={512}
        animate={{ y: [0, -12, 0], scale: [1, 1.05, 1] }}
        transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
      />
      <motion.img
        src={stickerGm}
        alt="GM FRENS"
        className="absolute bottom-32 right-4 md:right-24 w-20 md:w-28 pointer-events-none z-20 drop-shadow-2xl"
        loading="lazy" width={512} height={512}
        animate={{ y: [0, -18, 0], rotate: [-3, 3, -3] }}
        transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut", delay: 2 }}
      />

      <div className="relative z-10 container mx-auto px-6 flex flex-col items-center text-center pt-24">
        {/* Logo */}
        <motion.div
          className="flex items-center gap-3 mb-4"
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          <span className="font-display text-4xl md:text-5xl text-foreground tracking-wider">NAKA GO</span>
          <span className="font-jp text-2xl md:text-3xl text-muted-foreground ml-1">中号</span>
        </motion.div>

        {/* Headline */}
        <motion.h1
          className="font-display text-3xl md:text-5xl lg:text-7xl text-gradient mb-6 max-w-4xl leading-tight"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          style={{ textShadow: "0 0 40px hsla(18, 100%, 50%, 0.4)" }}
        >
          The Shiba Who Saved His Breed
        </motion.h1>

        {/* Description */}
        <motion.p
          className="font-body text-base md:text-lg text-muted-foreground max-w-xl mb-8 leading-relaxed"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.6 }}
        >
          Born 1948. Survived WWII. Became the genetic foundation of 80% of modern Shiba Inus. This is his story.
        </motion.p>

        {/* Contract Address */}
        <motion.div
          className="flex flex-col items-center gap-3 mb-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.7 }}
        >
          <p className="font-body text-sm text-muted-foreground">Contract Address</p>
          <p className="font-mono text-sm text-foreground/80">{SHORT_CONTRACT}</p>
          <motion.button
            onClick={handleCopy}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="flex items-center gap-2 px-6 py-2.5 rounded-full bg-primary/20 border border-primary/30 text-primary font-body text-sm hover:bg-primary/30 transition-all"
          >
            {copied ? <><Check className="w-4 h-4" /> Copied!</> : <><Copy className="w-4 h-4" /> Copy CA</>}
          </motion.button>
        </motion.div>

        {/* CTA */}
        <motion.div
          className="flex flex-col sm:flex-row gap-4 mb-10"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.8 }}
        >
          <motion.a
            href={`https://app.uniswap.org/swap?outputCurrency=${FULL_CONTRACT}&chain=ethereum`}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-gradient-naka text-primary-foreground font-display text-lg px-12 py-4 rounded-full glow-orange inline-flex items-center justify-center gap-2"
            whileHover={{ scale: 1.05, boxShadow: "0 0 40px hsla(18, 100%, 50%, 0.8)" }}
            whileTap={{ scale: 0.95 }}
          >
            <Rocket className="w-5 h-5" />
            Buy $NAKA
          </motion.a>
          <motion.a
            href={`https://dexscreener.com/ethereum/${FULL_CONTRACT}`}
            target="_blank"
            rel="noopener noreferrer"
            className="border-2 border-primary/50 text-primary font-display text-lg px-12 py-4 rounded-full inline-flex items-center justify-center gap-2 hover:bg-primary hover:text-primary-foreground transition-colors"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <TrendingUp className="w-5 h-5" />
            View Chart
          </motion.a>
        </motion.div>

        {/* Shiba mascot */}
        <motion.div
          className="relative w-72 h-72 md:w-[420px] md:h-[420px] mb-8"
          initial={{ scale: 0.5, opacity: 0, rotate: -10 }}
          animate={{ scale: 1, opacity: 1, rotate: 0 }}
          transition={{ duration: 1.2, delay: 0.3, type: "spring", stiffness: 80 }}
        >
          <motion.div
            className="w-full h-full rounded-full overflow-hidden border-4 border-primary/30"
            animate={{
              boxShadow: [
                "0 0 40px hsla(18, 100%, 50%, 0.3), 0 0 80px hsla(18, 100%, 50%, 0.1)",
                "0 0 60px hsla(18, 100%, 50%, 0.5), 0 0 120px hsla(18, 100%, 50%, 0.2)",
                "0 0 40px hsla(18, 100%, 50%, 0.3), 0 0 80px hsla(18, 100%, 50%, 0.1)",
              ],
            }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          >
            <img
              src={shibaMascot}
              alt="Naka Go, The legendary Shiba Inu"
              className="w-full h-full object-cover"
            />
          </motion.div>
          <motion.div
            className="absolute inset-0 rounded-full border-2 border-primary/20"
            animate={{ scale: [1, 1.15, 1], opacity: [0.5, 0, 0.5] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: "easeOut" }}
          />
        </motion.div>

        {/* Scroll indicator */}
        <motion.div
          className="mt-4"
          initial={{ opacity: 0 }}
          animate={{ y: [0, 10, 0], opacity: [0.6, 1, 0.6] }}
          transition={{ y: { duration: 1.5, repeat: Infinity }, opacity: { duration: 1.5, repeat: Infinity } }}
        >
          <ChevronDown className="w-8 h-8 text-muted-foreground" />
        </motion.div>
      </div>
    </section>
  );
};

export default Hero;
