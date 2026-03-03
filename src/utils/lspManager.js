class LSPManager {
  constructor() {
    this.ws = null
    this.messageId = 0
    this.pendingRequests = new Map()
    this.initialized = false
    this.capabilities = null
    this.openDocuments = new Set()
    this.listeners = new Map()
  }

  // Connect to LSP server (with simple retry/backoff)
  connect(serverUrl = 'ws://localhost:9999/lsp') {
    const attempt = (delay = 0, tries = 0) => {
      return new Promise((resolve, reject) => {
        if (tries > 5) {
          return reject(new Error('Failed to connect to LSP server after multiple attempts'))
        }

        setTimeout(() => {
          try {
            console.log(`🔌 Attempting LSP connection to ${serverUrl} (try #${tries + 1})`)
            this.ws = new WebSocket(serverUrl)

            this.ws.onopen = () => {
              console.log('✅ Connected to LSP server')
              this.initializeServer()
                .then(resolve)
                .catch((err) => {
                  console.error('LSP initialize failed:', err)
                  reject(err)
                })
            }

            this.ws.onmessage = (event) => {
              this.handleMessage(event.data)
            }

            this.ws.onerror = (error) => {
              console.error('LSP connection error:', error)
              // try again after delay
              attempt(Math.min(2000, delay * 2 || 500), tries + 1)
                .then(resolve)
                .catch(reject)
            }

            this.ws.onclose = () => {
              console.log('⚠️ Disconnected from LSP server')
              this.initialized = false
            }
          } catch (error) {
            console.error('WebSocket construction error:', error)
            // attempt again
            attempt(Math.min(2000, delay * 2 || 500), tries + 1)
              .then(resolve)
              .catch(reject)
          }
        }, delay)
      })
    }

    return attempt(0, 0)
  }

  // Initialize language server
  initializeServer() {
    return this.sendRequest('initialize', {
      processId: null,
      rootPath: null,
      rootUri: null,
      capabilities: {
        general: {
          regularExpressions: { engine: 'ECMAScript' },
          markdown: { parser: 'markdown', version: '1.0' }
        },
        textDocument: {
          synchronization: {
            dynamicRegistration: true,
            didSave: true,
            willSave: true,
            willSaveWaitUntil: true
          },
          completion: {
            dynamicRegistration: true,
            completionItem: {
              snippetSupport: true,
              commitCharactersSupport: true,
              documentationFormat: ['markdown', 'plaintext'],
              deprecatedSupport: true,
              preselectSupport: true,
              insertReplaceSupport: true,
              labelDetailsSupport: true
            },
            contextSupport: true
          },
          hover: {
            dynamicRegistration: true,
            contentFormat: ['markdown', 'plaintext']
          },
          signatureHelp: {
            dynamicRegistration: true,
            signatureInformation: {
              documentationFormat: ['markdown', 'plaintext'],
              parameterInformation: {
                labelOffsetSupport: true
              },
              activeParameterSupport: true
            }
          },
          declaration: { dynamicRegistration: true, linkSupport: true },
          definition: { dynamicRegistration: true, linkSupport: true },
          typeDefinition: { dynamicRegistration: true, linkSupport: true },
          implementation: { dynamicRegistration: true, linkSupport: true },
          references: { dynamicRegistration: true },
          documentHighlight: { dynamicRegistration: true },
          documentSymbol: {
            dynamicRegistration: true,
            symbolKind: { valueSet: Array.from({ length: 26 }, (_, i) => i + 1) },
            hierarchicalDocumentSymbolSupport: true
          },
          codeAction: {
            dynamicRegistration: true,
            codeActionLiteralSupport: {
              codeActionKind: {
                valueSet: ['quickfix', 'refactor', 'refactor.extract', 'source', 'source.organizeImports']
              }
            }
          },
          formatting: { dynamicRegistration: true },
          rangeFormatting: { dynamicRegistration: true },
          renameProvider: true,
          publishDiagnostics: { relatedInformation: true, tagSupport: { valueSet: [1, 2] } }
        },
        workspace: {
          didChangeConfiguration: { dynamicRegistration: true },
          didChangeWatchedFiles: { dynamicRegistration: true },
          workspaceFolders: true
        }
      }
    }).then((result) => {
      this.capabilities = result.capabilities
      this.initialized = true
      console.log('✅ Language server initialized')
      this.sendNotification('initialized', {})
      return result
    })
  }

  // ensure WebSocket is open before sending
  ensureOpen() {
    return new Promise((resolve, reject) => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        return resolve()
      }
      if (!this.ws) {
        return reject(new Error('WebSocket not initialized'))
      }
      const onOpen = () => {
        cleanup()
        resolve()
      }
      const onError = (err) => {
        cleanup()
        reject(err)
      }
      const cleanup = () => {
        this.ws.removeEventListener('open', onOpen)
        this.ws.removeEventListener('error', onError)
      }
      this.ws.addEventListener('open', onOpen)
      this.ws.addEventListener('error', onError)
    })
  }

  // Send request to language server
  async sendRequest(method, params) {
    await this.ensureOpen()
    return new Promise((resolve, reject) => {
      const id = ++this.messageId
      this.pendingRequests.set(id, { resolve, reject })

      try {
        this.ws.send(JSON.stringify({
          jsonrpc: '2.0',
          id,
          method,
          params
        }))

        setTimeout(() => {
          if (this.pendingRequests.has(id)) {
            this.pendingRequests.delete(id)
            reject(new Error(`Request timeout: ${method}`))
          }
        }, 30000)
      } catch (error) {
        this.pendingRequests.delete(id)
        reject(error)
      }
    })
  }

  // Send notification to language server
  async sendNotification(method, params) {
    try {
      await this.ensureOpen()
      this.ws.send(JSON.stringify({
        jsonrpc: '2.0',
        method,
        params
      }))
    } catch (error) {
      console.error(`Failed to send notification ${method}:`, error)
    }
  }

  // Handle response messages
  handleMessage(data) {
    try {
      const message = JSON.parse(data)

      if (message.id && this.pendingRequests.has(message.id)) {
        const { resolve, reject } = this.pendingRequests.get(message.id)
        this.pendingRequests.delete(message.id)

        if (message.error) {
          reject(new Error(message.error.message))
        } else {
          resolve(message.result)
        }
      }

      // Handle notifications
      if (message.method) {
        if (this.listeners.has(message.method)) {
          this.listeners.get(message.method).forEach(callback => {
            try {
              callback(message.params)
            } catch (error) {
              console.error(`Error in listener for ${message.method}:`, error)
            }
          })
        }
      }
    } catch (error) {
      console.error('Error handling message:', error)
    }
  }

  // Subscribe to notifications
  on(method, callback) {
    if (!this.listeners.has(method)) {
      this.listeners.set(method, [])
    }
    this.listeners.get(method).push(callback)
  }

  // Document operations
  async didOpen(uri, languageId, content) {
    this.openDocuments.add(uri)
    this.sendNotification('textDocument/didOpen', {
      textDocument: {
        uri,
        languageId,
        version: 1,
        text: content
      }
    })
  }

  async didChange(uri, content, version = 1) {
    this.sendNotification('textDocument/didChange', {
      textDocument: { uri, version },
      contentChanges: [{ text: content }]
    })
  }

  async didSave(uri) {
    this.sendNotification('textDocument/didSave', {
      textDocument: { uri }
    })
  }

  async didClose(uri) {
    this.openDocuments.delete(uri)
    this.sendNotification('textDocument/didClose', {
      textDocument: { uri }
    })
  }

  // LSP Features
  async getCompletion(uri, line, character) {
    return this.sendRequest('textDocument/completion', {
      textDocument: { uri },
      position: { line, character }
    })
  }

  async getHover(uri, line, character) {
    return this.sendRequest('textDocument/hover', {
      textDocument: { uri },
      position: { line, character }
    })
  }

  async getDefinition(uri, line, character) {
    return this.sendRequest('textDocument/definition', {
      textDocument: { uri },
      position: { line, character }
    })
  }

  async getReferences(uri, line, character, includeDeclaration = true) {
    return this.sendRequest('textDocument/references', {
      textDocument: { uri },
      position: { line, character },
      context: { includeDeclaration }
    })
  }

  async getDocumentSymbols(uri) {
    return this.sendRequest('textDocument/documentSymbol', {
      textDocument: { uri }
    })
  }

  async getCodeActions(uri, range, diagnostics = []) {
    return this.sendRequest('textDocument/codeAction', {
      textDocument: { uri },
      range,
      context: { diagnostics }
    })
  }

  async formatDocument(uri, options = {}) {
    return this.sendRequest('textDocument/formatting', {
      textDocument: { uri },
      options: {
        tabSize: options.tabSize || 2,
        insertSpaces: options.insertSpaces !== false,
        ...options
      }
    })
  }

  async rename(uri, line, character, newName) {
    return this.sendRequest('textDocument/rename', {
      textDocument: { uri },
      position: { line, character },
      newName
    })
  }

  disconnect() {
    if (this.ws) {
      this.ws.close()
    }
  }
}

export const lspManager = new LSPManager()
