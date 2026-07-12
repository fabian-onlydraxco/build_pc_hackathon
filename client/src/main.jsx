import React from 'react'
import { createRoot } from 'react-dom/client'

import '@fontsource/space-grotesk/400.css'
import '@fontsource/space-grotesk/500.css'
import '@fontsource/space-grotesk/700.css'
import '@fontsource/jetbrains-mono/400.css'
import '@fontsource/jetbrains-mono/700.css'

import './styles/tokens.css'
import './styles/base.css'
import './styles/shared.css'
import './styles/dash.css'
import './styles/control.css'
import './styles/onboarding.css'

import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
