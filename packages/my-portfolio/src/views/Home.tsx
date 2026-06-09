import {
  ArrowRight,
  BriefcaseBusiness,
  Code2,
  Database,
  Download,
  ExternalLink,
  Mail,
  Server,
  Sparkles,
} from '@mypartner/common/dependencies'
import { CONTACT_INFO, PERSONAL_INFO, SOCIAL_LINKS } from '../constants'
import type { PortfolioRoute } from '../constants'
import { downloadDefaultResume } from '../utils/downloadResume'
import Logo from '../components/Logo'

interface HomeProps {
  onNavigate: (path: string) => void
  routes: {
    HOME: PortfolioRoute
    PROFILE: PortfolioRoute
    TECH_STACK: PortfolioRoute
  }
}

const skills = [
  { name: 'React', level: 'Expert', icon: Code2 },
  { name: 'Angular', level: 'Expert', icon: Code2 },
  { name: 'TypeScript', level: 'Advanced', icon: Sparkles },
  { name: 'Node.js', level: 'Advanced', icon: Server },
  { name: 'MongoDB', level: 'Advanced', icon: Database },
  { name: 'PostgreSQL', level: 'Intermediate', icon: Database },
]

const projects = [
  {
    title: 'OrganizeSwift',
    description: 'Task management platform for creating, editing, and organizing work.',
    tags: ['Angular', 'TypeScript', 'Node.js'],
  },
  {
    title: 'InstantNotes',
    description: 'MERN note-taking app for fast capture and organized personal notes.',
    tags: ['React', 'MongoDB', 'Express'],
  },
  {
    title: 'CodingForum',
    description: 'Q&A platform for developer discussions with authentication and responsive UI.',
    tags: ['JavaScript', 'MySQL', 'PHP'],
  },
]

const Home = ({ onNavigate, routes }: HomeProps) => {
  return (
    <div>
      <section className="border-b border-line bg-surface-0">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-10 sm:px-6 lg:grid-cols-[1fr_360px] lg:py-14">
          <div className="min-w-0">
            <span className="inline-flex items-center gap-2 rounded-lg border border-forest/20 bg-forest/10 px-3 py-1 text-xs font-bold text-forest">
              <span className="h-2 w-2 rounded-full bg-forest" />
              Available for opportunities
            </span>

            <h1 className="mt-5 max-w-3xl text-4xl font-black leading-tight text-ink-1 sm:text-5xl">
              {PERSONAL_INFO.NAME}
            </h1>
            <p className="mt-3 text-xl font-semibold text-forest">{PERSONAL_INFO.TITLE}</p>
            <p className="mt-4 max-w-2xl text-base leading-7 text-ink-2">
              Crafting practical digital experiences with {PERSONAL_INFO.EXPERIENCE_YEARS} years of work across React,
              Angular, TypeScript, and full-stack product delivery.
            </p>

            <div className="mt-7 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => onNavigate(routes.PROFILE)}
                className="inline-flex items-center gap-2 rounded-lg bg-forest px-5 py-2.5 text-sm font-bold text-white transition hover:bg-forest-strong"
              >
                View profile
                <ArrowRight className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={downloadDefaultResume}
                className="inline-flex items-center gap-2 rounded-lg border border-line bg-surface-1 px-5 py-2.5 text-sm font-bold text-ink-2 transition hover:bg-surface-2 hover:text-ink-1"
              >
                <Download className="h-4 w-4" />
                Download resume
              </button>
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-2 text-sm text-ink-2">
              <a className="inline-flex items-center gap-2 rounded-lg border border-line bg-surface-1 px-3 py-2 hover:text-forest" href={SOCIAL_LINKS.GITHUB} target="_blank" rel="noreferrer">
                <Code2 className="h-4 w-4" />
                GitHub
              </a>
              <a className="inline-flex items-center gap-2 rounded-lg border border-line bg-surface-1 px-3 py-2 hover:text-forest" href={SOCIAL_LINKS.LINKEDIN} target="_blank" rel="noreferrer">
                <ExternalLink className="h-4 w-4" />
                LinkedIn
              </a>
              <a className="inline-flex items-center gap-2 rounded-lg border border-line bg-surface-1 px-3 py-2 hover:text-forest" href={`mailto:${CONTACT_INFO.EMAIL}`}>
                <Mail className="h-4 w-4" />
                Email
              </a>
            </div>
          </div>

          <aside className="rounded-lg border border-line bg-surface-1 p-5">
            <div className="flex items-center gap-4">
              <Logo width="72" height="72" />
              <div>
                <p className="text-sm font-extrabold text-ink-1">{PERSONAL_INFO.ROLE}</p>
                <p className="mt-1 text-xs leading-5 text-ink-3">Bhopal, Madhya Pradesh</p>
              </div>
            </div>
            <dl className="mt-5 grid grid-cols-3 gap-3 text-center">
              {[
                ['3+', 'Years'],
                ['10+', 'Projects'],
                ['15+', 'Tech'],
              ].map(([value, label]) => (
                <div key={label} className="rounded-lg bg-surface-2 p-3">
                  <dt className="text-xl font-black text-ink-1">{value}</dt>
                  <dd className="text-[11px] font-semibold uppercase text-ink-3">{label}</dd>
                </div>
              ))}
            </dl>
          </aside>
        </div>
      </section>

      <section className="border-b border-line bg-surface-1">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
          <div className="mb-6 flex items-end justify-between gap-4">
            <div>
              <h2 className="text-2xl font-black text-ink-1">Skills and Expertise</h2>
              <p className="mt-1 text-sm text-ink-3">Core MEAN and MERN stack strengths</p>
            </div>
            <button type="button" onClick={() => onNavigate(routes.TECH_STACK)} className="hidden items-center gap-2 text-sm font-bold text-forest hover:text-forest-strong sm:inline-flex">
              Full stack
              <ExternalLink className="h-4 w-4" />
            </button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {skills.map(skill => {
              const Icon = skill.icon
              return (
                <article key={skill.name} className="rounded-lg border border-line bg-surface-0 p-4">
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-forest/10 text-forest">
                      <Icon className="h-5 w-5" />
                    </span>
                    <div>
                      <h3 className="font-bold text-ink-1">{skill.name}</h3>
                      <p className="text-xs font-semibold text-ink-3">{skill.level}</p>
                    </div>
                  </div>
                </article>
              )
            })}
          </div>
        </div>
      </section>

      <section className="bg-surface-0">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
          <h2 className="text-2xl font-black text-ink-1">Featured Projects</h2>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {projects.map(project => (
              <article key={project.title} className="rounded-lg border border-line bg-surface-1 p-5">
                <BriefcaseBusiness className="h-5 w-5 text-forest" />
                <h3 className="mt-4 text-lg font-black text-ink-1">{project.title}</h3>
                <p className="mt-2 min-h-16 text-sm leading-6 text-ink-2">{project.description}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {project.tags.map(tag => (
                    <span key={tag} className="rounded-md bg-forest/10 px-2 py-1 text-xs font-bold text-forest">
                      {tag}
                    </span>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}

export default Home
