import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { AuthProvider } from './context/AuthContext.jsx'
import { MessagingProvider } from './context/MessagingContext.jsx'
import { ThemeProvider } from './context/ThemeContext.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ThemeProvider>
      <AuthProvider>
        <MessagingProvider>
          <App />
        </MessagingProvider>
      </AuthProvider>
    </ThemeProvider>
  </StrictMode>,
)
