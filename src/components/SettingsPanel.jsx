import { FiX, FiSettings } from 'react-icons/fi';

const set = (settings, onSettingsChange, key, value) =>
  onSettingsChange({ ...settings, [key]: value });

const Toggle = ({ label, desc, checked, onChange }) => (
  <label className="flex items-center justify-between py-2.5 cursor-pointer group">
    <div>
      <div className="ide-text-bright text-sm">{label}</div>
      {desc && <div className="ide-text-muted text-xs mt-0.5">{desc}</div>}
    </div>
    <div
      onClick={onChange}
      className={`relative w-9 h-5 rounded-full transition-colors shrink-0 ml-4
        ${checked ? 'bg-[#0e639c]' : 'ide-btn-bg'}`}
    >
      <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform
        ${checked ? 'translate-x-4' : 'translate-x-0'}`} />
    </div>
  </label>
);

const Section = ({ title, children }) => (
  <div className="mb-6">
    <h3 className="text-[10px] uppercase tracking-widest ide-text-muted font-semibold mb-2 pb-1 border-b ide-border-c">{title}</h3>
    <div className="divide-y ide-border-sub-c">{children}</div>
  </div>
);

export default function SettingsPanel({ isOpen, onClose, settings, onSettingsChange }) {
  const upd = (key, value) => onSettingsChange({ ...settings, [key]: value });
  const tog = (key) => upd(key, !settings[key]);

  if (!isOpen) return null;

  const FONTS = [
    "'Fira Code', monospace",
    "'JetBrains Mono', monospace",
    "'Cascadia Code', monospace",
    "'Consolas', monospace",
    "'Courier New', monospace",
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-[600px] mx-4 ide-base-bg border ide-border-inp-c rounded-lg shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
        onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b ide-border-c ide-sidebar-bg shrink-0">
          <div className="flex items-center gap-2 ide-text-bright font-semibold">
            <FiSettings size={16} /> Settings
          </div>
          <button onClick={onClose} className="ide-text-muted ide-h-text-white p-1 rounded ide-h-btn">
            <FiX size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-5 py-4">

          <Section title="Theme">
            <div className="py-2.5 flex gap-2">
              {[['Dark', '🌑'], ['Light', '☀️']].map(([t, icon]) => (
                <button key={t}
                  className={`flex-1 py-2 rounded text-sm font-medium transition-colors
                    ${(settings.theme || 'Dark') === t
                      ? 'bg-[#0e639c] text-white'
                      : 'ide-btn-bg ide-text-bright ide-h-btn-dk'}`}
                  onClick={() => upd('theme', t)}>
                  {icon} {t}
                </button>
              ))}
            </div>
          </Section>

          <Section title="Editor">
            {/* Font Size */}
            <div className="py-2.5">
              <div className="flex justify-between items-center mb-1.5">
                <span className="ide-text-bright text-sm">Font Size</span>
                <span className="text-[#0e639c] font-mono text-sm font-bold">{settings.fontSize || 14}px</span>
              </div>
              <input type="range" min="10" max="28" value={settings.fontSize || 14}
                onChange={e => upd('fontSize', parseInt(e.target.value))}
                className="w-full accent-[#0e639c]" />
              <div className="flex justify-between text-[10px] ide-text-muted mt-0.5"><span>10</span><span>28</span></div>
            </div>

            {/* Tab Size */}
            <div className="py-2.5">
              <div className="flex justify-between items-center mb-1.5">
                <span className="ide-text-bright text-sm">Tab Size</span>
                <span className="text-[#0e639c] font-mono text-sm font-bold">{settings.tabSize || 2}</span>
              </div>
              <div className="flex gap-2">
                {[2, 4, 8].map(n => (
                  <button key={n}
                    className={`flex-1 py-1.5 rounded text-xs font-mono transition-colors
                      ${(settings.tabSize || 2) === n ? 'bg-[#0e639c] text-white' : 'ide-btn-bg ide-text-bright ide-h-btn-dk'}`}
                    onClick={() => upd('tabSize', n)}>{n} spaces</button>
                ))}
              </div>
            </div>

            {/* Font Family */}
            <div className="py-2.5">
              <div className="ide-text-bright text-sm mb-1.5">Font Family</div>
              <select
                value={settings.fontFamily || FONTS[0]}
                onChange={e => upd('fontFamily', e.target.value)}
                className="w-full ide-input-bg ide-text-bright text-xs px-2 py-1.5 rounded border ide-border-inp-c outline-none focus:border-[#007acc]">
                {FONTS.map(f => <option key={f} value={f}>{f.split(',')[0].replace(/'/g,'')}</option>)}
              </select>
            </div>

            <Toggle label="Word Wrap" desc="Wrap long lines at viewport edge" checked={!!settings.wordWrap} onChange={() => tog('wordWrap')} />
            <Toggle label="Minimap" desc="Show code minimap on the right" checked={settings.minimap !== false} onChange={() => tog('minimap')} />
            <Toggle label="Format on Save" desc="Auto-format when saving a file" checked={!!settings.formatOnSave} onChange={() => tog('formatOnSave')} />
            <Toggle label="Auto Save" desc="Save after 1s of inactivity" checked={!!settings.autoSave} onChange={() => tog('autoSave')} />
          </Section>

          <Section title="Display">
            <Toggle label="Status Bar" desc="Show the bottom status bar" checked={settings.statusBar !== false} onChange={() => tog('statusBar')} />
            <Toggle label="Line Numbers" desc="Show line numbers in gutter" checked={settings.lineNumbers !== false} onChange={() => tog('lineNumbers')} />
            <Toggle label="Breadcrumbs" desc="Show file path breadcrumbs" checked={settings.breadcrumbs !== false} onChange={() => tog('breadcrumbs')} />
          </Section>

          <Section title="Files">
            <Toggle label="Trim Trailing Whitespace" checked={settings.trimTrailingWhitespace !== false} onChange={() => tog('trimTrailingWhitespace')} />
            <Toggle label="Insert Final Newline" checked={settings.insertFinalNewline !== false} onChange={() => tog('insertFinalNewline')} />
          </Section>
        </div>

        {/* Footer */}
        <div className="px-5 py-2.5 border-t ide-border-c ide-sidebar-bg flex justify-end shrink-0">
          <button onClick={onClose}
            className="px-4 py-1.5 rounded bg-[#0e639c] hover:bg-[#1177bb] text-white text-sm">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
