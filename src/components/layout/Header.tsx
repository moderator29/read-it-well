import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, Home, Rocket } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import shibaMascot from "@/assets/shiba-mascot.jpeg";

const FULL_CONTRACT = "0x6967b9a8c0b14849CFE8f9E5732B401433fD2898";

const navLinks = [
  { label: "About", href: "/#about" },
  { label: "Tokenomics", href: "/#tokenomics" },
  { label: "Community", href: "/#community" },
  { label: "App", href: "/app" },
];

const Header = () => {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const handleNavClick = (href: string) => {
    setMobileOpen(false);
    if (href.startsWith("/#")) {
      const id = href.slice(2);
      if (location.pathname === "/") {
        document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
      } else {
        window.location.href = href;
      }
    }
  };

  return (
    <motion.header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled ? "bg-background/80 backdrop-blur-xl border-b border-border" : "bg-transparent"
      }`}
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.6 }}
    >
      <div className="container mx-auto flex items-center justify-between px-6 py-3">
        <Link to="/" className="flex items-center gap-3">
          <img
            src={shibaMascot}
            alt="Naka Go"
            className="w-10 h-10 rounded-full border-2 border-primary/30 shadow-lg shadow-primary/20"
          />
          <div className="flex items-center gap-2">
            <span className="font-display text-xl text-foreground tracking-wide">NAKA GO</span>
            <span className="font-jp text-sm text-muted-foreground">中号</span>
          </div>
        </Link>

        <nav className="hidden md:flex items-center gap-8">
          {navLinks.map((link) =>
            link.href.startsWith("/") && !link.href.startsWith("/#") ? (
              <Link
                key={link.label}
                to={link.href}
                className="text-sm font-body font-semibold text-muted-foreground hover:text-foreground transition-colors"
              >
                {link.label}
              </Link>
            ) : (
              <button
                key={link.label}
                onClick={() => handleNavClick(link.href)}
                className="text-sm font-body font-semibold text-muted-foreground hover:text-foreground transition-colors"
              >
                {link.label}
              </button>
            )
          )}
          <motion.a
            href={`https://app.uniswap.org/swap?outputCurrency=${FULL_CONTRACT}&chain=ethereum`}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-gradient-naka text-primary-foreground font-display text-sm px-6 py-2.5 rounded-full glow-orange inline-flex items-center gap-2"
            whileHover={{ scale: 1.05 }}
          >
            <Rocket className="w-4 h-4" />
            Buy $NAKA
          </motion.a>
        </nav>

        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="md:hidden text-foreground p-2"
        >
          {mobileOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-background/95 backdrop-blur-xl border-b border-border"
          >
            <div className="flex flex-col items-center gap-4 py-6">
              <Link
                to="/"
                onClick={() => setMobileOpen(false)}
                className="text-foreground font-body font-semibold text-lg inline-flex items-center gap-2"
              >
                <Home className="w-4 h-4" /> Home
              </Link>
              {navLinks.map((link) =>
                link.href.startsWith("/") && !link.href.startsWith("/#") ? (
                  <Link
                    key={link.label}
                    to={link.href}
                    onClick={() => setMobileOpen(false)}
                    className="text-foreground font-body font-semibold text-lg"
                  >
                    {link.label}
                  </Link>
                ) : (
                  <button
                    key={link.label}
                    onClick={() => handleNavClick(link.href)}
                    className="text-foreground font-body font-semibold text-lg"
                  >
                    {link.label}
                  </button>
                )
              )}
              <a
                href={`https://app.uniswap.org/swap?outputCurrency=${FULL_CONTRACT}&chain=ethereum`}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-gradient-naka text-primary-foreground font-display px-8 py-3 rounded-full glow-orange inline-flex items-center gap-2"
              >
                <Rocket className="w-4 h-4" />
                Buy $NAKA
              </a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  );
};

export default Header;
