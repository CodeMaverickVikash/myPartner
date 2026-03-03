import express from 'express';
import expressWs from 'express-ws';
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
expressWs(app);

const LSP_PORT = 5002;
const FILES_DIR = path.join(__dirname, 'user-files');

// Store active language server processes
const lspProcesses = new Map();

// WebSocket endpoint for LSP communication
app.ws('/lsp', (ws, req) => {
  console.log('LSP client connected');

  let childProcess;

  ws.on('message', (msg) => {
    try {
      const data = JSON.parse(msg);
      
      // Start TypeScript Language Server on first message
      if (!childProcess) {
        childProcess = spawn('node', [
          path.join(__dirname, 'node_modules', '.bin', 'typescript-language-server'),
          '--stdio'
        ], {
          cwd: FILES_DIR,
          stdio: ['pipe', 'pipe', 'pipe']
        });

        // Forward stdout from language server to client
        childProcess.stdout.on('data', (chunk) => {
          try {
            ws.send(chunk.toString());
          } catch (e) {
            console.error('Error sending to client:', e);
          }
        });

        childProcess.stderr.on('data', (chunk) => {
          console.error('LSP stderr:', chunk.toString());
        });

        childProcess.on('close', (code) => {
          console.log('Language server closed:', code);
          ws.close();
        });
      }

      // Send message to language server
      if (childProcess && childProcess.stdin) {
        childProcess.stdin.write(msg);
      }
    } catch (error) {
      console.error('LSP error:', error);
    }
  });

  ws.on('close', () => {
    console.log('LSP client disconnected');
    if (childProcess) {
      childProcess.kill();
    }
  });

  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
    if (childProcess) {
      childProcess.kill();
    }
  });
});

app.listen(LSP_PORT, () => {
  console.log(`LSP server running on ws://localhost:${LSP_PORT}`);
});