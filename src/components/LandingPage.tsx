import HeroSection from "./landing/HeroSection";
import ChatRoomSection from "./landing/ChatRoomSection";
import FeaturesSection from "./landing/FeaturesSection";
import OpenSourceSection from "./landing/OpenSourceSection";
import TokenomicsSection from "./landing/TokenomicsSection";
import RoadmapSection from "./landing/RoadmapSection";

import Footer from "./landing/Footer";
import type { Companion } from "../lib/companions";
import "../styles/landing.css";

interface LandingPageProps {
  onChatOpen: () => void;
  companion: Companion;
  onCompanionChange: (id: string) => void;
}

export default function LandingPage({ onChatOpen, companion, onCompanionChange }: LandingPageProps) {
  return (
    <>
      <HeroSection onChatOpen={onChatOpen} companion={companion} />
      <ChatRoomSection companion={companion} onCompanionChange={onCompanionChange} />
      <FeaturesSection />
      <OpenSourceSection />
      <TokenomicsSection />
      <RoadmapSection />
      <Footer />
    </>
  );
}
