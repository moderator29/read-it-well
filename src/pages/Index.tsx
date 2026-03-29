import Header from "@/components/layout/Header";
import Hero from "@/components/home/Hero";
import Timeline from "@/components/home/Timeline";
import StatsBlock from "@/components/home/StatsBlock";
import Tokenomics from "@/components/home/Tokenomics";
import MemeStickers from "@/components/home/MemeStickers";
import DdergoEmbed from "@/components/home/DdergoEmbed";
import TradingChart from "@/components/home/TradingChart";
import Community from "@/components/home/Community";
import Footer from "@/components/layout/Footer";

const Index = () => {
  return (
    <main className="bg-background min-h-screen">
      <Header />
      <Hero />
      <MemeStickers />
      <Timeline />
      <StatsBlock />
      <TradingChart />
      <Tokenomics />
      <DdergoEmbed />
      <Community />
      <Footer />
    </main>
  );
};

export default Index;
