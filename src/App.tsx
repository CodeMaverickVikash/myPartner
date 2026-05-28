import './App.css'
import { Toaster } from 'react-hot-toast'
import MarkdownWrapper from './components/markdown/MarkdownWrapper'

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
      <MarkdownWrapper />
    </>
  );
}

export default App;
