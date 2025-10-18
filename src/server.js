import config from './config.js'
import app, { createApp } from './app.js'

const PORT = config.port

;(async () => {
  await createApp()
  app.listen(PORT, () => console.log(`✅ Mock server running at http://localhost:${PORT}`))
})()
