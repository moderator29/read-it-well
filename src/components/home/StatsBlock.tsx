import { motion, useInView } from "framer-motion";
import { useRef, useState, useEffect } from "react";

const stats = [
  { value: 80, suffix: "%+", label: "Influenced", desc: "Modern Shibas trace back to Naka Go's bloodline" },
  { value: 1948, suffix: "", label: "Born", desc: "Post-WWII Japan, when Shibas faced extinction" },
  { value: 0, suffix: "", label: "NIPPO", desc: "Recognized by Nihon Ken Hozonkai preservation society", isText: true },
  { value: 0, suffix: "", label: "$NAKA", desc: "Honoring the legend on Ethereum", isText: true },
];

const CountUp = ({ end, suffix, duration = 2 }: { end: number; suffix: string; duration?: number }) => {
  const [count, setCount] = useState(0);
  const ref = useRef(null);
  const inView = useInView(ref, { once: true });

  useEffect(() => {
    if (!inView) return;
    let start = 0;
    const step = end / (duration * 60);
    const timer = setInterval(() => {
      start += step;
      if (start >= end) {
        setCount(end);
        clearInterval(timer);
      } else {
        setCount(Math.floor(start));
      }
    }, 1000 / 60);
    return () => clearInterval(timer);
  }, [inView, end, duration]);

  return <span ref={ref}>{count}{suffix}</span>;
};

const StatsBlock = () => {
  return (
    <section className="py-24 md:py-32 bg-secondary/30">
      <div className="container mx-auto px-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
          {stats.map((stat, i) => (
            <motion.div
              key={stat.label}
              className="glass-card p-6 md:p-8 text-center"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
            >
              <div className="font-display text-3xl md:text-5xl text-gradient mb-3">
                {stat.isText ? stat.label : <CountUp end={stat.value} suffix={stat.suffix} />}
              </div>
              {!stat.isText && (
                <div className="font-display text-sm text-primary mb-2">{stat.label}</div>
              )}
              <p className="text-xs md:text-sm text-muted-foreground font-body">{stat.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default StatsBlock;
