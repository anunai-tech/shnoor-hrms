import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { AuthProvider } from './context/AuthContext.jsx'
import { MessagingProvider } from './context/MessagingContext.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthProvider>
      <MessagingProvider>
        <App />
      </MessagingProvider>
    </AuthProvider>
  </StrictMode>,
)
