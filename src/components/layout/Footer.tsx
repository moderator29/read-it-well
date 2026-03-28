const Footer = () => {
  return (
    <footer className="bg-background border-t border-border py-12">
      <div className="container mx-auto px-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-8">
          {/* Brand */}
          <div className="flex items-center gap-2">
            <span className="font-display text-xl text-foreground">NAKA GO</span>
            <span className="font-jp text-foreground/60">中号</span>
          </div>

          {/* Links */}
          <nav className="flex items-center gap-6 text-sm text-muted-foreground">
            <a href="#about" className="hover:text-foreground transition-colors">About</a>
            <a href="#tokenomics" className="hover:text-foreground transition-colors">Tokenomics</a>
            <a href="#community" className="hover:text-foreground transition-colors">Community</a>
          </nav>

          {/* Socials */}
          <div className="flex items-center gap-4">
            <a href="https://t.me/NakaGoCult" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary transition-colors text-sm font-semibold">Telegram</a>
            <a href="https://x.com/NakaGoInu" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary transition-colors text-sm font-semibold">𝕏</a>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-border text-center text-xs text-muted-foreground">
          <p>Built with ❤️ for Naka Go 🍦 &copy; 2025</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
