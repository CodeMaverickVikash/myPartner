import React from 'react'
import './App.css'
import toast, { Toaster } from 'react-hot-toast'
import VSCodeEditor from './components/VSCodeEditor'

function App() {
  return (
    <>
      <Toaster
        position="bottom-right"
        reverseOrder={false}
        toastOptions={{
          duration: 2500,
          style: {
            background: '#252526',
            color: '#d4d4d4',
            padding: '10px 14px',
            borderRadius: '6px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
            fontSize: '13px',
            fontWeight: '500',
            border: '1px solid #3e3e42',
          },
          success: {
            style: { background: '#1a3a2a', color: '#4ec994', border: '1px solid #2d6a4f' },
            iconTheme: { primary: '#4ec994', secondary: '#1a3a2a' }
          },
          error: {
            style: { background: '#3a1a1a', color: '#f48771', border: '1px solid #6a2d2d' },
            iconTheme: { primary: '#f48771', secondary: '#3a1a1a' }
          }
        }}
      />
      <VSCodeEditor />
    </>
  );
}

export default App;