import { Link } from "react-router-dom";
import { Send, MessageCircle, BookOpen, ExternalLink } from "lucide-react";
import shibaMascot from "@/assets/shiba-mascot.jpeg";

const FULL_CONTRACT = "0x6967b9a8c0b14849CFE8f9E5732B401433fD2898";

const Footer = () => {
  return (
    <footer className="bg-secondary/30 border-t border-border py-12">
      <div className="container mx-auto px-6">
        <div className="flex flex-col items-center gap-6 mb-8">
          <Link to="/" className="flex items-center gap-3">
            <img src={shibaMascot} alt="Naka Go" className="w-12 h-12 rounded-full border-2 border-primary/30" />
            <div className="flex items-center gap-2">
              <span className="font-display text-xl text-primary">NAKA GO</span>
              <span className="font-jp text-sm text-muted-foreground">中号</span>
            </div>
          </Link>

          <nav className="flex flex-wrap items-center justify-center gap-6 text-sm">
            <a href="https://t.me/NakaGoInu" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground transition-colors font-body inline-flex items-center gap-2">
              <Send className="w-4 h-4" /> Telegram
            </a>
            <a href="https://x.com/NakaGoInu" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground transition-colors font-body inline-flex items-center gap-2">
              <MessageCircle className="w-4 h-4" /> @NakaGoInu
            </a>
            <a href="https://x.com/N4kaishi8a/status/1959984583665230297" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground transition-colors font-body inline-flex items-center gap-2">
              <BookOpen className="w-4 h-4" /> Medium
            </a>
            <a href={`https://etherscan.io/token/${FULL_CONTRACT}`} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground transition-colors font-body inline-flex items-center gap-2">
              <ExternalLink className="w-4 h-4" /> Etherscan
            </a>
          </nav>
        </div>

        <div className="pt-6 border-t border-border text-center text-xs text-muted-foreground">
          <p>Built with ❤️ for Naka Go 🍦 © 2025</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
