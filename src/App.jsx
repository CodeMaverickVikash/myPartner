import React from 'react'
import './App.css'
import toast, { Toaster } from 'react-hot-toast'
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import CodeEditor from './components/CodeEditor/CodeEditor'

function App() {
  return (
    <>
      <Toaster
        position="bottom-right"
        reverseOrder={false}
        toastOptions={{
          // Default options
          duration: 3000,
          style: {
            background: '#fff',
            color: '#374151',
            padding: '12px 16px',
            borderRadius: '8px',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
            fontSize: '14px',
            fontWeight: '500'
          },
          // Success toast style
          success: {
            style: {
              background: '#10b981',
              color: '#fff'
            },
            iconTheme: {
              primary: '#fff',
              secondary: '#10b981'
            }
          },
          // Error toast style
          error: {
            style: {
              background: '#ef4444',
              color: '#fff'
            },
            iconTheme: {
              primary: '#fff',
              secondary: '#ef4444'
            }
          }
        }}
      />
      <BrowserRouter>
        <Routes>
          <Route path="/" exact element={<CodeEditor />} />
        </Routes>
      </BrowserRouter>
    </>
  );
}

export default App;