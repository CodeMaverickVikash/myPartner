import { FiX, FiSettings } from 'react-icons/fi';
import './SettingsPanel.css';

export default function SettingsPanel({ isOpen, onClose, settings, onSettingsChange }) {
  const handleToggle = (key) => {
    onSettingsChange({
      ...settings,
      [key]: !settings[key]
    });
  };

  const handleFontSizeChange = (e) => {
    onSettingsChange({
      ...settings,
      fontSize: parseInt(e.target.value)
    });
  };

  const handleThemeChange = (theme) => {
    onSettingsChange({
      ...settings,
      theme
    });
  };

  if (!isOpen) return null;

  return (
    <div className="settings-panel-overlay" onClick={onClose}>
      <div className="settings-panel" onClick={(e) => e.stopPropagation()}>
        <div className="settings-header">
          <div className="settings-title">
            <FiSettings size={18} />
            <h2>Settings</h2>
          </div>
          <button className="settings-close" onClick={onClose}>
            <FiX size={18} />
          </button>
        </div>

        <div className="settings-content">
          {/* Editor Settings */}
          <div className="settings-section">
            <h3>Editor</h3>
            
            <div className="setting-item">
              <label>Font Size</label>
              <div className="font-size-control">
                <input
                  type="range"
                  min="10"
                  max="24"
                  value={settings.fontSize || 14}
                  onChange={handleFontSizeChange}
                />
                <span className="font-size-value">{settings.fontSize || 14}px</span>
              </div>
            </div>

            <div className="setting-item">
              <label>
                <input
                  type="checkbox"
                  checked={settings.wordWrap || false}
                  onChange={() => handleToggle('wordWrap')}
                />
                Word Wrap
              </label>
            </div>

            <div className="setting-item">
              <label>
                <input
                  type="checkbox"
                  checked={settings.minimap || true}
                  onChange={() => handleToggle('minimap')}
                />
                Minimap
              </label>
            </div>

            <div className="setting-item">
              <label>
                <input
                  type="checkbox"
                  checked={settings.formatOnSave || true}
                  onChange={() => handleToggle('formatOnSave')}
                />
                Format on Save
              </label>
            </div>

            <div className="setting-item">
              <label>
                <input
                  type="checkbox"
                  checked={settings.autoSave || true}
                  onChange={() => handleToggle('autoSave')}
                />
                Auto Save
              </label>
            </div>
          </div>

          {/* Theme Settings */}
          <div className="settings-section">
            <h3>Theme</h3>
            <div className="theme-options">
              {['Dark', 'Light'].map(theme => (
                <button
                  key={theme}
                  className={`theme-option ${(settings.theme || 'Dark') === theme ? 'active' : ''}`}
                  onClick={() => handleThemeChange(theme)}
                >
                  {theme}
                </button>
              ))}
            </div>
          </div>

          {/* Display Settings */}
          <div className="settings-section">
            <h3>Display</h3>
            
            <div className="setting-item">
              <label>
                <input
                  type="checkbox"
                  checked={settings.statusBar || true}
                  onChange={() => handleToggle('statusBar')}
                />
                Show Status Bar
              </label>
            </div>

            <div className="setting-item">
              <label>
                <input
                  type="checkbox"
                  checked={settings.breadcrumbs || true}
                  onChange={() => handleToggle('breadcrumbs')}
                />
                Show Breadcrumbs
              </label>
            </div>

            <div className="setting-item">
              <label>
                <input
                  type="checkbox"
                  checked={settings.lineNumbers || true}
                  onChange={() => handleToggle('lineNumbers')}
                />
                Show Line Numbers
              </label>
            </div>
          </div>

          {/* File Settings */}
          <div className="settings-section">
            <h3>Files</h3>
            
            <div className="setting-item">
              <label>
                <input
                  type="checkbox"
                  checked={settings.trimTrailingWhitespace || true}
                  onChange={() => handleToggle('trimTrailingWhitespace')}
                />
                Trim Trailing Whitespace
              </label>
            </div>

            <div className="setting-item">
              <label>
                <input
                  type="checkbox"
                  checked={settings.insertFinalNewline || true}
                  onChange={() => handleToggle('insertFinalNewline')}
                />
                Insert Final Newline
              </label>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
