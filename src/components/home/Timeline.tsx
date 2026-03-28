import { motion } from "framer-motion";

const timelineData = [
  {
    year: "1948",
    title: "Birth of a Legend",
    description:
      "Naka Go of Akaishi-so was born just after World War II devastated Japan. The Shiba Inu breed faced extinction from disease, famine, and war.",
  },
  {
    year: "1950s",
    title: "The Foundation",
    description:
      "Naka Go became the cornerstone of the Akaishi bloodline. His exceptional traits — strong structure, noble expression, independent spirit — defined the breed standard.",
  },
  {
    year: "1960s–1990s",
    title: "The Legacy Spreads",
    description:
      "Through careful breeding, Naka Go's genetics spread globally. Over 80% of modern Shiba Inus trace their lineage back to him.",
  },
  {
    year: "Today",
    title: "Eternal Impact",
    description:
      "Without Naka Go, the Shiba Inu — and the Doge meme — might not exist today. His legacy lives on through $NAKA, honoring the dog who saved his breed.",
  },
];

const Timeline = () => {
  return (
    <section id="about" className="py-24 md:py-32 bg-background">
      <div className="container mx-auto px-6">
        <motion.h2
          className="font-display text-3xl md:text-5xl text-gradient text-center mb-20"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          The Story of Naka Go
        </motion.h2>

        <div className="relative max-w-3xl mx-auto">
          {/* Vertical line */}
          <div className="absolute left-6 md:left-1/2 top-0 bottom-0 w-px bg-border" />

          {timelineData.map((item, i) => (
            <motion.div
              key={item.year}
              className={`relative flex items-start gap-8 mb-16 last:mb-0 ${
                i % 2 === 0 ? "md:flex-row" : "md:flex-row-reverse"
              }`}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: i * 0.15 }}
            >
              {/* Year circle */}
              <div className="absolute left-6 md:left-1/2 -translate-x-1/2 w-12 h-12 rounded-full bg-gradient-naka flex items-center justify-center text-primary-foreground font-display text-xs z-10 glow-orange shrink-0">
                {item.year.slice(0, 4)}
              </div>

              {/* Content card */}
              <div
                className={`ml-20 md:ml-0 md:w-[calc(50%-3rem)] glass-card p-6 md:p-8 ${
                  i % 2 === 0 ? "md:mr-auto md:text-right" : "md:ml-auto md:text-left"
                }`}
              >
                <span className="font-display text-sm text-primary mb-1 block">{item.year}</span>
                <h3 className="font-display text-xl md:text-2xl text-foreground mb-3">{item.title}</h3>
                <p className="font-body text-sm text-muted-foreground leading-relaxed">{item.description}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Timeline;
