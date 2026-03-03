import express from 'express'
import expressWs from 'express-ws'
import { spawn } from 'child_process'
import path from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
expressWs(app)

const LSP_PORT = 9999
const FILES_DIR = path.join(__dirname, 'user-files')

// Ensure directories exist
if (!fs.existsSync(FILES_DIR)) {
  fs.mkdirSync(FILES_DIR, { recursive: true })
}

// Store active LSP processes per client
const lspProcesses = new Map()

// WebSocket endpoint for LSP communication
app.ws('/lsp', (ws, req) => {
  const clientId = Math.random().toString(36).substr(2, 9)
  console.log(`[${clientId}] LSP client connected`)

  let lspProcess = null
  let buffer = ''

  // Start TypeScript Language Server
  const startLSP = () => {
    try {
      // Try to start typescript-language-server
      lspProcess = spawn('npx', ['typescript-language-server', '--stdio'], {
        cwd: FILES_DIR,
        stdio: ['pipe', 'pipe', 'pipe'],
        shell: true
      })

      // Handle stdout
      lspProcess.stdout.on('data', (chunk) => {
        try {
          const text = chunk.toString('utf8')
          buffer += text

          // Process complete messages (LSP uses Content-Length header)
          const lines = buffer.split('\r\n')
          
          for (let i = 0; i < lines.length - 1; i++) {
            const line = lines[i]
            if (line.startsWith('Content-Length:')) {
              const contentLength = parseInt(line.split(':')[1].trim())
              if (i + 2 < lines.length) {
                const msgStart = buffer.indexOf('\r\n\r\n') + 4
                if (msgStart + contentLength <= buffer.length) {
                  const message = buffer.substr(msgStart, contentLength)
                  try {
                    ws.send(message)
                  } catch (e) {
                    console.error(`[${clientId}] Error sending to client:`, e.message)
                  }
                }
              }
            }
          }
          
          // Keep incomplete message
          if (lines.length > 0) {
            buffer = lines[lines.length - 1]
          }
        } catch (error) {
          console.error(`[${clientId}] Error processing LSP message:`, error.message)
        }
      })

      // Handle stderr
      lspProcess.stderr.on('data', (chunk) => {
        console.error(`[${clientId}] LSP stderr:`, chunk.toString())
      })

      // Handle process close
      lspProcess.on('close', (code) => {
        console.log(`[${clientId}] LSP process closed with code ${code}`)
        lspProcesses.delete(clientId)
        try {
          ws.close()
        } catch (e) {
          // ws already closed
        }
      })

      lspProcesses.set(clientId, lspProcess)
    } catch (error) {
      console.error(`[${clientId}] Failed to start LSP:`, error.message)
      ws.send(JSON.stringify({
        jsonrpc: '2.0',
        error: { code: -32603, message: 'Failed to start language server' }
      }))
    }
  }

  startLSP()

  // Handle incoming messages from client
  ws.on('message', (msg) => {
    try {
      if (lspProcess && lspProcess.stdin) {
        // Add LSP headers to message
        const content = msg.toString()
        const header = `Content-Length: ${Buffer.byteLength(content, 'utf8')}\r\n\r\n`
        lspProcess.stdin.write(header + content)
      }
    } catch (error) {
      console.error(`[${clientId}] Error sending to LSP:`, error.message)
    }
  })

  // Handle client disconnect
  ws.on('close', () => {
    console.log(`[${clientId}] Client disconnected`)
    if (lspProcess) {
      lspProcess.kill()
      lspProcesses.delete(clientId)
    }
  })

  ws.on('error', (error) => {
    console.error(`[${clientId}] WebSocket error:`, error.message)
    if (lspProcess) {
      lspProcess.kill()
      lspProcesses.delete(clientId)
    }
  })
})

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'LSP Bridge running',
    port: LSP_PORT,
    activeConnections: lspProcesses.size
  })
})

// Get LSP status
app.get('/status', (req, res) => {
  res.json({
    lspServerRunning: true,
    websocketAddress: `ws://localhost:${LSP_PORT}/lsp`,
    activeConnections: lspProcesses.size
  })
})

app.listen(LSP_PORT, () => {
  console.log(`
╔════════════════════════════════════════════╗
║  🚀 LSP Bridge Server Ready                ║
║  WebSocket: ws://localhost:${LSP_PORT}/lsp      ║
║  Health Check: http://localhost:${LSP_PORT}/health ║
╚════════════════════════════════════════════╝
  `)
})
