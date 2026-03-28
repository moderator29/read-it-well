import { Link } from "react-router-dom";
import shibaMascot from "@/assets/shiba-mascot.jpeg";

const Footer = () => {
  return (
    <footer className="bg-secondary/30 border-t border-border py-12">
      <div className="container mx-auto px-6">
        <div className="flex flex-col items-center gap-6 mb-8">
          {/* Brand */}
          <div className="flex items-center gap-3">
            <img src={shibaMascot} alt="Naka Go" className="w-12 h-12 rounded-full border-2 border-primary/30" />
            <div>
              <span className="font-display text-xl text-primary">NakaGo Community</span>
              <span className="font-jp text-sm text-muted-foreground ml-2">中号</span>
            </div>
            <span className="text-2xl">🍦</span>
          </div>

          {/* Social Links */}
          <nav className="flex flex-wrap items-center justify-center gap-6 text-sm">
            <a href="https://t.me/NakaGoCult" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground transition-colors font-body inline-flex items-center gap-1">
              <span>↗</span> Telegram
            </a>
            <a href="https://nakago.xyz" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground transition-colors font-body inline-flex items-center gap-1">
              <span>↗</span> Website
            </a>
            <a href="https://x.com/NakaGoInu" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground transition-colors font-body inline-flex items-center gap-1">
              <span>↗</span> @NakaGoInu
            </a>
          </nav>
          <a href="https://x.com/NakaGoCommunity" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground transition-colors font-body text-sm inline-flex items-center gap-1">
            <span>↗</span> @NakaGoCommunity
          </a>
        </div>

        <div className="pt-6 border-t border-border text-center text-xs text-muted-foreground">
          <p>Built with ❤️ for Naka Go 🍦 &copy; 2025</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
