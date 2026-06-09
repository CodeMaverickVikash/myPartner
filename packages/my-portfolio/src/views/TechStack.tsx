import { ChangeEvent, useMemo, useState } from 'react'
import {
  BookOpenText,
  Code2,
  Database,
  Layers3,
  Search,
  Server,
  Sparkles,
  Wrench,
} from '@mypartner/common/dependencies'
import techStackData from '../data/tech-stack.json'
import type { Category, TechItem } from '../types'
import { getDifficultyColor } from '../utils/utils'

const iconMap = {
  default: Code2,
  frontend: Layers3,
  backend: Server,
  database: Database,
  tools: Wrench,
  framework: Sparkles,
}

const categories: Category[] = [
  { name: 'All', icon: BookOpenText },
  { name: 'Frontend', icon: Layers3 },
  { name: 'Backend', icon: Server },
  { name: 'Database', icon: Database },
  { name: 'Framework', icon: Sparkles },
  { name: 'Tools', icon: Wrench },
]

const techStack = techStackData as TechItem[]

const TechStack = () => {
  const [selectedCategory, setSelectedCategory] = useState<string>('All')
  const [searchQuery, setSearchQuery] = useState<string>('')

  const activeTechStack = useMemo(() => techStack.filter(tech => tech.isActive), [])
  const filteredTechnologies = activeTechStack.filter(tech => {
    const normalizedSearch = searchQuery.toLowerCase()
    const matchesCategory = selectedCategory === 'All' || tech.category === selectedCategory
    const matchesSearch =
      tech.name.toLowerCase().includes(normalizedSearch) ||
      tech.description.toLowerCase().includes(normalizedSearch) ||
      tech.features.some(feature => feature.toLowerCase().includes(normalizedSearch))

    return matchesCategory && matchesSearch
  })

  return (
    <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="mb-8">
        <h1 className="text-3xl font-black text-ink-1">Full-Stack Tech Stack</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-ink-2">
          JSON-managed overview of the technologies used across frontend, backend, databases, and tooling.
        </p>
      </div>

      <div className="mb-6 max-w-2xl">
        <label className="relative block">
          <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-3" />
          <input
            type="text"
            placeholder="Search technologies, frameworks, tools..."
            value={searchQuery}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-line bg-surface-1 py-3 pl-11 pr-4 text-sm text-ink-1 outline-none transition focus:border-forest focus:ring-2 focus:ring-forest/20"
          />
        </label>
      </div>

      <div className="mb-8 flex flex-wrap gap-2">
        {categories.map(category => {
          const Icon = category.icon
          const isActive = selectedCategory === category.name
          return (
            <button
              key={category.name}
              type="button"
              onClick={() => setSelectedCategory(category.name)}
              className={[
                'inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-bold transition',
                isActive
                  ? 'border-forest bg-forest text-white'
                  : 'border-line bg-surface-1 text-ink-2 hover:bg-surface-2 hover:text-ink-1',
              ].join(' ')}
            >
              <Icon className="h-4 w-4" />
              {category.name}
            </button>
          )
        })}
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {filteredTechnologies.length > 0 ? (
          filteredTechnologies.map(tech => {
            const Icon = iconForCategory(tech.category)
            return (
              <article key={tech.id} className="rounded-lg border border-line bg-surface-1 p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-forest/10 text-forest">
                      <Icon className="h-5 w-5" />
                    </span>
                    <div>
                      <h2 className="text-lg font-black text-ink-1">{tech.name}</h2>
                      <p className="text-xs text-ink-3">Since {tech.year}</p>
                    </div>
                  </div>
                  <span className={`rounded-md border px-2 py-1 text-xs font-bold ${getDifficultyColor(tech.difficulty)}`}>
                    {tech.difficulty}
                  </span>
                </div>

                <p className="mt-4 text-sm leading-6 text-ink-2">{tech.description}</p>

                <div className="mt-4 flex flex-wrap gap-2">
                  <span className="rounded-md bg-surface-2 px-2 py-1 text-xs font-bold text-ink-2">{tech.paradigm}</span>
                  <span className="rounded-md bg-forest/10 px-2 py-1 text-xs font-bold text-forest">{tech.category}</span>
                </div>

                <div className="mt-4">
                  <h3 className="text-sm font-black text-ink-1">Key Features</h3>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {tech.features.map(feature => (
                      <span key={feature} className="rounded-md border border-line bg-surface-0 px-2 py-1 text-xs text-ink-2">
                        {feature}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="mt-4">
                  <h3 className="text-sm font-black text-ink-1">Common Use Cases</h3>
                  <ul className="mt-2 space-y-1 text-xs text-ink-2">
                    {tech.useCases.map(useCase => (
                      <li key={useCase} className="flex gap-2">
                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-forest" />
                        {useCase}
                      </li>
                    ))}
                  </ul>
                </div>
              </article>
            )
          })
        ) : (
          <div className="col-span-full rounded-lg border border-line bg-surface-1 p-10 text-center">
            <Code2 className="mx-auto h-10 w-10 text-ink-3" />
            <h3 className="mt-4 text-lg font-black text-ink-1">No technologies found</h3>
            <p className="mt-1 text-sm text-ink-2">Try adjusting your search or filter criteria.</p>
          </div>
        )}
      </div>

      {filteredTechnologies.length > 0 && (
        <p className="mt-6 text-sm text-ink-2">
          Showing <strong className="text-forest">{filteredTechnologies.length}</strong> of{' '}
          <strong>{activeTechStack.length}</strong> technologies
        </p>
      )}
    </section>
  )
}

function iconForCategory(category: string) {
  const key = category.toLowerCase() as keyof typeof iconMap
  return iconMap[key] ?? iconMap.default
}

export default TechStack
