import Header from "@/components/layout/Header";
import Hero from "@/components/home/Hero";
import Timeline from "@/components/home/Timeline";
import StatsBlock from "@/components/home/StatsBlock";
import Tokenomics from "@/components/home/Tokenomics";
import Community from "@/components/home/Community";
import Footer from "@/components/layout/Footer";

const Index = () => {
  return (
    <main className="bg-background min-h-screen">
      <Header />
      <Hero />
      <Timeline />
      <StatsBlock />
      <Tokenomics />
      <Community />
      <Footer />
    </main>
  );
};

export default Index;
