import { IoFolder, IoCreate, IoSync, IoBook, IoDocument, IoCode } from 'react-icons/io5'

function WelcomeScreen() {
  return (
    <div className="flex-1 overflow-y-auto bg-gradient-to-br from-cream/20 to-white relative">
      <div className="max-w-5xl mx-auto px-6 py-8">
        {/* Hero Section */}
        <div className="text-center mb-13">
          <h1 className="text-1xl md:text-3xl mb-4 text-gray-900 font-bold tracking-tight">
            Markdown Editor
          </h1>
          <p className="text-sm text-gray-500 leading-relaxed max-w-xl mx-auto">
            Open, edit, and preview your markdown files with direct system access
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          <div className="bg-white p-6 rounded-lg border border-sage/40 transition-all duration-200 hover:border-forest hover:shadow-md">
            <div className="w-12 h-12 bg-forest/20 rounded-lg flex items-center justify-center mb-4">
              <IoFolder className="w-6 h-6 text-forest" />
            </div>
            <h3 className="text-lg mb-2 text-gray-900 font-semibold">Direct File Access</h3>
            <p className="text-sm text-gray-600 leading-relaxed">
              Open files directly from your system with live editing
            </p>
          </div>

          <div className="bg-white p-6 rounded-lg border border-sage/40 transition-all duration-200 hover:border-forest hover:shadow-md">
            <div className="w-12 h-12 bg-forest/20 rounded-lg flex items-center justify-center mb-4">
              <IoCreate className="w-6 h-6 text-forest" />
            </div>
            <h3 className="text-lg mb-2 text-gray-900 font-semibold">Split View Editing</h3>
            <p className="text-sm text-gray-600 leading-relaxed">
              Edit markdown with real-time preview side by side
            </p>
          </div>

          <div className="bg-white p-6 rounded-lg border border-sage/40 transition-all duration-200 hover:border-forest hover:shadow-md">
            <div className="w-12 h-12 bg-forest/20 rounded-lg flex items-center justify-center mb-4">
              <IoSync className="w-6 h-6 text-forest" />
            </div>
            <h3 className="text-lg mb-2 text-gray-900 font-semibold">Auto-Sync</h3>
            <p className="text-sm text-gray-600 leading-relaxed">
              Changes from external editors sync automatically
            </p>
          </div>
        </div>

        {/* Additional Features */}
        <div className="bg-white rounded-lg border border-sage/40 p-8">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">Key Features</h2>
            <p className="text-gray-600 text-sm">Everything you need for markdown documentation</p>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="flex gap-4">
              <div className="shrink-0">
                <div className="w-10 h-10 bg-forest/20 rounded-lg flex items-center justify-center">
                  <IoCode className="w-5 h-5 text-forest" />
                </div>
              </div>
              <div>
                <h4 className="font-medium text-gray-900 mb-1">Syntax Highlighting</h4>
                <p className="text-sm text-gray-600 leading-relaxed">Beautiful code blocks with highlight.js support</p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="shrink-0">
                <div className="w-10 h-10 bg-forest/20 rounded-lg flex items-center justify-center">
                  <IoDocument className="w-5 h-5 text-forest" />
                </div>
              </div>
              <div>
                <h4 className="font-medium text-gray-900 mb-1">Multiple Files</h4>
                <p className="text-sm text-gray-600 leading-relaxed">Manage and switch between multiple files</p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="shrink-0">
                <div className="w-10 h-10 bg-forest/20 rounded-lg flex items-center justify-center">
                  <IoBook className="w-5 h-5 text-forest" />
                </div>
              </div>
              <div>
                <h4 className="font-medium text-gray-900 mb-1">Table of Contents</h4>
                <p className="text-sm text-gray-600 leading-relaxed">Auto-generated navigation from headings</p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="shrink-0">
                <div className="w-10 h-10 bg-forest/20 rounded-lg flex items-center justify-center">
                  <IoSync className="w-5 h-5 text-forest" />
                </div>
              </div>
              <div>
                <h4 className="font-medium text-gray-900 mb-1">Live Sync</h4>
                <p className="text-sm text-gray-600 leading-relaxed">Files sync automatically with external changes</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default WelcomeScreen

