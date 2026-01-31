import { useState, useCallback, Component, type ReactNode, type ErrorInfo } from "react";
import LanguageSplash from "./components/LanguageSplash";
import CustomCursor from "./components/CustomCursor";
import Navbar from "./components/landing/Navbar";
import LandingPage from "./components/LandingPage";
import COMPANIONS, { getCompanionById } from "./lib/companions";
import "./App.css";

/* ─── Error Boundary ─── */
interface EBState { error: string | null }
class ErrorBoundary extends Component<{ children: ReactNode }, EBState> {
  state: EBState = { error: null };
  static getDerivedStateFromError(err: Error) { return { error: err.message }; }
  componentDidCatch(err: Error, info: ErrorInfo) { console.error("App crash:", err, info); }
  render() {
    if (this.state.error) {
      return (
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "center",
          height: "100vh", background: "#0f0f1a", color: "#ff6b6b",
          flexDirection: "column", gap: 16, padding: 32, textAlign: "center",
          fontFamily: "system-ui, sans-serif"
        }}>
          <h2 style={{ color: "#fff" }}>Something crashed</h2>
          <pre style={{
            background: "#1a1a2e", padding: 16, borderRadius: 8,
            maxWidth: 600, overflow: "auto", fontSize: "0.85rem"
          }}>{this.state.error}</pre>
          <button onClick={() => { this.setState({ error: null }); window.location.reload(); }}
            style={{
              padding: "10px 24px", border: "none", borderRadius: 8,
              background: "#4c6ef5", color: "#fff", cursor: "pointer", fontSize: "0.9rem"
            }}>
            Reload
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  const [companionId, setCompanionId] = useState(COMPANIONS[0].id);
  const companion = getCompanionById(companionId);

  const handleCompanionChange = useCallback((id: string) => {
    setCompanionId(id);
  }, []);

  const scrollToChat = useCallback(() => {
    document.getElementById("chatroom")?.scrollIntoView({ behavior: "smooth" });
  }, []);

  return (
    <ErrorBoundary>
      <CustomCursor />
      <LanguageSplash />
      <Navbar onChatOpen={scrollToChat} />
      <main>
        <LandingPage
          onChatOpen={scrollToChat}
          companion={companion}
          onCompanionChange={handleCompanionChange}
        />
      </main>
    </ErrorBoundary>
  );
}
