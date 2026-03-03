import ReconnectingWebSocket from 'reconnecting-websocket';
import { MonacoLanguageClient, CloseAction, ErrorAction } from 'monaco-languageclient';

let client = null;
let messageId = 0;

export const initLSP = async (monaco) => {
  try {
    const webSocket = new ReconnectingWebSocket('ws://localhost:5002/lsp', [], {
      maxReconnectionDelay: 10000,
      minReconnectionDelay: 1000,
      reconnectionDelayGrowFactor: 1.3,
      connectionTimeoutInterval: 10000,
      maxRetries: Infinity,
      debug: false,
    });

    client = new MonacoLanguageClient({
      name: 'TypeScript Language Client',
      clientOptions: {
        documentSelector: [
          { language: 'typescript', scheme: 'file' },
          { language: 'javascript', scheme: 'file' },
          { language: 'typescriptreact', scheme: 'file' },
          { language: 'javascriptreact', scheme: 'file' },
        ],
        errorHandler: {
          error: () => ErrorAction.Continue,
          closed: () => CloseAction.DoNotRestart,
        },
        middleware: {
          executeCommand: async (command, args, executeCommand) => {
            console.log('Executing command:', command);
            return await executeCommand(command, args);
          },
        },
      },
      connectionProvider: {
        get: (errorHandler, closeHandler) => {
          return Promise.resolve({
            onDispose: () => webSocket.close(),
            send: (message) => {
              messageId++;
              webSocket.send(JSON.stringify({ ...message, id: messageId }));
            },
            onMessage: (callback) => {
              webSocket.addEventListener('message', (event) => {
                callback(JSON.parse(event.data));
              });
            },
            onError: errorHandler,
            onClose: closeHandler,
            dispose: () => {},
          });
        },
      },
    });

    await client.start();
    return client;
  } catch (error) {
    console.error('Failed to initialize LSP:', error);
    return null;
  }
};

export const getLanguageClient = () => client;