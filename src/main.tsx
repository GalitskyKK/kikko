import React from 'react'
import ReactDOM from 'react-dom/client'
import '@fontsource/inter/400.css'
import '@fontsource/inter/500.css'
import '@fontsource/inter/600.css'
import { App } from '@/App'
import { STRINGS } from '@/lib/strings'
import '@/themes/globals.css'

const rootElement = document.getElementById('root')

if (!rootElement) {
  throw new Error(STRINGS.errors.rootNotFound)
}

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
