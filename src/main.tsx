import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { LanguageProvider } from './i18n/LanguageContext'
import { WalletProvider } from './lib/wallet'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <LanguageProvider>
      <WalletProvider>
        <App />
      </WalletProvider>
    </LanguageProvider>
  </StrictMode>,
)
