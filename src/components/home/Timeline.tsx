import { motion } from "framer-motion";

const timelineData = [
  {
    year: "1945",
    title: "Post WWII Extinction Threat",
    description:
      "The Shiba Inu breed faced near extinction after World War II, with only a handful of dogs remaining across Japan.",
  },
  {
    year: "1948",
    title: "Naka Go's Birth",
    description:
      "Born on April 16, 1948, Naka Go emerged as a beacon of hope for the Shiba Inu breed's survival.",
  },
  {
    year: "1950s",
    title: "Akaishi Line Establishment",
    description:
      "Naka Go became the foundation of the Akaishi line, establishing the bloodline that would define modern Shiba Inus.",
  },
  {
    year: "1963",
    title: "Legacy Secured",
    description:
      "Naka Go passed away on December 23, 1963, leaving behind a genetic legacy present in 80% of modern Shiba Inus.",
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
              <motion.div
                className="absolute left-6 md:left-1/2 -translate-x-1/2 w-12 h-12 rounded-full bg-gradient-naka flex items-center justify-center text-primary-foreground font-display text-xs z-10 glow-orange shrink-0"
                whileInView={{ scale: [0, 1.2, 1] }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.15 }}
              >
                {item.year.slice(0, 4)}
              </motion.div>

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
