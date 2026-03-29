import { motion } from "framer-motion";
import stickerGoUp from "@/assets/sticker-go-up.png";
import stickerMoon from "@/assets/sticker-moon.png";
import stickerHodl from "@/assets/sticker-hodl.png";
import stickerGm from "@/assets/sticker-gm.png";

const stickers = [
  { src: stickerGoUp, alt: "NAKA GO UP", delay: 0 },
  { src: stickerMoon, alt: "NAKA MOON", delay: 0.1 },
  { src: stickerHodl, alt: "HODL", delay: 0.2 },
  { src: stickerGm, alt: "GM FRENS", delay: 0.3 },
];

const MemeStickers = () => {
  return (
    <section className="py-16 md:py-24 bg-secondary/30 overflow-hidden">
      <div className="container mx-auto px-6">
        <motion.h2
          className="font-display text-3xl md:text-5xl text-gradient text-center mb-4"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          Community Art 🎨
        </motion.h2>
        <motion.p
          className="font-body text-muted-foreground text-center mb-12 text-lg"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1 }}
        >
          Stickers, memes, and vibes from the Naka Go community
        </motion.p>

        {/* Scrolling sticker strip */}
        <div className="flex items-center justify-center gap-6 md:gap-12 flex-wrap">
          {stickers.map((sticker, i) => (
            <motion.div
              key={sticker.alt}
              className="relative"
              initial={{ opacity: 0, scale: 0.5, rotate: -15 }}
              whileInView={{ opacity: 1, scale: 1, rotate: 0 }}
              viewport={{ once: true }}
              transition={{ delay: sticker.delay, type: "spring", stiffness: 150 }}
              whileHover={{ scale: 1.15, rotate: [0, -5, 5, 0], transition: { duration: 0.4 } }}
            >
              <motion.img
                src={sticker.src}
                alt={sticker.alt}
                className="w-32 h-32 md:w-44 md:h-44 object-contain drop-shadow-2xl cursor-pointer"
                loading="lazy" width={512} height={512}
                animate={{ y: [0, -8, 0] }}
                transition={{ duration: 3 + i * 0.5, repeat: Infinity, ease: "easeInOut" }}
              />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default MemeStickers;
