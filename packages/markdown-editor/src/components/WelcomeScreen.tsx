import { Folder, PenLine, RefreshCw, BookOpen, FileText, Code } from '@mypartner/common/dependencies'

function WelcomeScreen() {
  return (
    <div className="flex-1 overflow-y-auto bg-surface-0">
      <div className="max-w-3xl mx-auto px-8 py-12">
        {/* Hero Section */}
        <div className="mb-10">
          <h1 className="text-2xl font-bold text-ink-1 tracking-tight mb-1.5">
            Markdown Editor
          </h1>
          <p className="text-sm text-ink-3 leading-relaxed">
            Open, edit, and preview markdown files with direct system access and live sync.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-3 gap-4 mb-8">
          <div className="bg-surface-1 p-5 rounded-lg border border-line transition-all duration-200 hover:border-forest/50 hover:shadow-sm">
            <div className="w-9 h-9 bg-forest/10 rounded-md flex items-center justify-center mb-3">
              <Folder className="w-5 h-5 text-forest" />
            </div>
            <h3 className="text-sm font-semibold text-ink-1 mb-1">Direct File Access</h3>
            <p className="text-xs text-ink-3 leading-relaxed">
              Open files from your system and edit them live
            </p>
          </div>

          <div className="bg-surface-1 p-5 rounded-lg border border-line transition-all duration-200 hover:border-forest/50 hover:shadow-sm">
            <div className="w-9 h-9 bg-forest/10 rounded-md flex items-center justify-center mb-3">
              <PenLine className="w-5 h-5 text-forest" />
            </div>
            <h3 className="text-sm font-semibold text-ink-1 mb-1">Visual Editing</h3>
            <p className="text-xs text-ink-3 leading-relaxed">
              Edit with a rich toolbar — no markdown syntax needed
            </p>
          </div>

          <div className="bg-surface-1 p-5 rounded-lg border border-line transition-all duration-200 hover:border-forest/50 hover:shadow-sm">
            <div className="w-9 h-9 bg-forest/10 rounded-md flex items-center justify-center mb-3">
              <RefreshCw className="w-5 h-5 text-forest" />
            </div>
            <h3 className="text-sm font-semibold text-ink-1 mb-1">Auto-Sync</h3>
            <p className="text-xs text-ink-3 leading-relaxed">
              External editor changes reload automatically
            </p>
          </div>
        </div>

        {/* Additional Features */}
        <div className="bg-surface-1 rounded-lg border border-line p-6">
          <h2 className="text-xs font-semibold text-ink-3 uppercase tracking-wider mb-4">Also included</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="flex gap-3 items-start">
              <div className="w-7 h-7 bg-forest/10 rounded-md flex items-center justify-center shrink-0 mt-0.5">
                <Code className="w-4 h-4 text-forest" />
              </div>
              <div>
                <h4 className="text-sm font-medium text-ink-1 mb-0.5">Syntax Highlighting</h4>
                <p className="text-xs text-ink-3 leading-relaxed">Code blocks via highlight.js</p>
              </div>
            </div>

            <div className="flex gap-3 items-start">
              <div className="w-7 h-7 bg-forest/10 rounded-md flex items-center justify-center shrink-0 mt-0.5">
                <FileText className="w-4 h-4 text-forest" />
              </div>
              <div>
                <h4 className="text-sm font-medium text-ink-1 mb-0.5">Multiple Files</h4>
                <p className="text-xs text-ink-3 leading-relaxed">Manage and switch between files</p>
              </div>
            </div>

            <div className="flex gap-3 items-start">
              <div className="w-7 h-7 bg-forest/10 rounded-md flex items-center justify-center shrink-0 mt-0.5">
                <BookOpen className="w-4 h-4 text-forest" />
              </div>
              <div>
                <h4 className="text-sm font-medium text-ink-1 mb-0.5">Table of Contents</h4>
                <p className="text-xs text-ink-3 leading-relaxed">Auto-generated from headings</p>
              </div>
            </div>

            <div className="flex gap-3 items-start">
              <div className="w-7 h-7 bg-forest/10 rounded-md flex items-center justify-center shrink-0 mt-0.5">
                <RefreshCw className="w-4 h-4 text-forest" />
              </div>
              <div>
                <h4 className="text-sm font-medium text-ink-1 mb-0.5">Live Sync</h4>
                <p className="text-xs text-ink-3 leading-relaxed">Polls for external file changes</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default WelcomeScreen

