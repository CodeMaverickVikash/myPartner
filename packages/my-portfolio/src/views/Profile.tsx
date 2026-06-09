import {
  BriefcaseBusiness,
  Download,
  GraduationCap,
  Mail,
  MapPin,
  Phone,
  UserRound,
} from '@mypartner/common/dependencies'
import { CONTACT_INFO, PERSONAL_INFO, SOCIAL_LINKS } from '../constants'
import Logo from '../components/Logo'
import { downloadDefaultResume } from '../utils/downloadResume'

const skills = [
  ['Languages', 'JavaScript, TypeScript, HTML, CSS, SCSS'],
  ['Frameworks', 'Angular, React.js, Node.js, Angular.js'],
  ['Database', 'MongoDB, MySQL, PostgreSQL'],
  ['Styling', 'Bootstrap, Tailwind CSS, Angular Material'],
  ['Tools', 'Git, Jira, Bitbucket, SourceTree, GitHub, browser dev tools'],
  ['Practices', 'Debugging, documentation, code optimization, agile collaboration'],
]

const projects = [
  {
    title: 'OrganizeSwift',
    detail: 'Task management web app with create, edit, update, delete, and organized task workflows.',
    stack: 'Angular, TypeScript, Node.js, ng-bootstrap, SCSS, Angular Material, Bootstrap, HTML',
  },
  {
    title: 'InstantNotes',
    detail: 'MERN note-taking app for efficient organization and focused personal notes.',
    stack: 'JavaScript, Node.js, React.js, MongoDB, JWT, Express.js, mongoose, bcrypt, Bootstrap',
  },
  {
    title: 'CodingForum',
    detail: 'Question and answer website for developer discussion and knowledge sharing.',
    stack: 'JavaScript, jQuery, MySQL, Bootstrap, XAMPP, HTML, CSS, PHP',
  },
]

const Profile = () => {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="mb-5 flex justify-end">
        <button
          type="button"
          onClick={downloadDefaultResume}
          className="inline-flex items-center gap-2 rounded-lg bg-forest px-4 py-2 text-sm font-bold text-white hover:bg-forest-strong"
        >
          <Download className="h-4 w-4" />
          Download resume
        </button>
      </div>

      <div className="grid gap-5 lg:grid-cols-[320px_1fr]">
        <aside className="space-y-5">
          <section className="rounded-lg border border-line bg-surface-1 p-5">
            <div className="flex flex-col items-center text-center">
              <Logo width="84" height="84" />
              <h1 className="mt-4 text-xl font-black text-ink-1">{PERSONAL_INFO.NAME}</h1>
              <p className="mt-1 text-sm font-semibold text-forest">{PERSONAL_INFO.ROLE}</p>
              <p className="mt-4 text-sm leading-6 text-ink-2">
                Experienced software engineer building user-friendly interfaces and modern web applications with a focus on collaboration, quality, and maintainability.
              </p>
            </div>
            <div className="mt-5 grid gap-2 rounded-lg bg-surface-2 p-3 text-sm text-ink-2">
              <div className="flex justify-between"><span>Status</span><strong className="text-forest">Active</strong></div>
              <div className="flex justify-between"><span>Experience</span><strong className="text-ink-1">3+ years</strong></div>
            </div>
          </section>

          <section className="rounded-lg border border-line bg-surface-1 p-5">
            <h2 className="font-black text-ink-1">Contact</h2>
            <div className="mt-4 grid gap-3 text-sm text-ink-2">
              <a className="flex gap-2 hover:text-forest" href={`tel:${CONTACT_INFO.PHONE.replace(/\s/g, '')}`}>
                <Phone className="h-4 w-4 shrink-0" />
                {CONTACT_INFO.PHONE}
              </a>
              <a className="flex gap-2 break-all hover:text-forest" href={`mailto:${CONTACT_INFO.EMAIL}`}>
                <Mail className="h-4 w-4 shrink-0" />
                {CONTACT_INFO.EMAIL}
              </a>
              <span className="flex gap-2">
                <MapPin className="h-4 w-4 shrink-0" />
                {CONTACT_INFO.LOCATION}
              </span>
              <a className="break-all text-forest hover:text-forest-strong" href={SOCIAL_LINKS.LINKEDIN} target="_blank" rel="noreferrer">
                linkedin.com/in/vikash-maskhare
              </a>
              <a className="break-all text-forest hover:text-forest-strong" href={SOCIAL_LINKS.GITHUB} target="_blank" rel="noreferrer">
                github.com/CodeMaverickVikash
              </a>
            </div>
          </section>
        </aside>

        <div className="space-y-5">
          <section className="rounded-lg border border-line bg-surface-1 p-5">
            <h2 className="flex items-center gap-2 text-lg font-black text-ink-1">
              <UserRound className="h-5 w-5 text-forest" />
              About
            </h2>
            <div className="mt-4 grid gap-3 text-sm text-ink-2 md:grid-cols-2">
              <Info label="First Name" value="Vikash" />
              <Info label="Last Name" value="Maskhare" />
              <Info label="Email" value={CONTACT_INFO.EMAIL} />
              <Info label="Birthday" value="23 May 2000" />
            </div>
          </section>

          <section className="rounded-lg border border-line bg-surface-1 p-5">
            <h2 className="flex items-center gap-2 text-lg font-black text-ink-1">
              <BriefcaseBusiness className="h-5 w-5 text-forest" />
              Professional Experience
            </h2>
            <div className="mt-4 rounded-lg border border-line bg-surface-0 p-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h3 className="font-black text-ink-1">Asite Solutions Pvt Ltd</h3>
                  <p className="text-sm font-semibold text-forest">{PERSONAL_INFO.ROLE}</p>
                </div>
                <p className="text-sm text-ink-3">Ahmedabad | 2022 - Present</p>
              </div>
              <ul className="mt-4 list-disc space-y-2 pl-5 text-sm leading-6 text-ink-2">
                <li>Designed and developed interfaces for web applications across multiple platforms.</li>
                <li>Built responsive components with HTML, CSS, JavaScript, TypeScript, Angular, and React.</li>
                <li>Collaborated with UX, backend, and product teams to translate design requirements into working code.</li>
                <li>Improved code quality through debugging, documentation, reviews, and performance optimization.</li>
              </ul>
            </div>
          </section>

          <section className="rounded-lg border border-line bg-surface-1 p-5">
            <h2 className="font-black text-ink-1">Technical Skills</h2>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {skills.map(([label, value]) => (
                <Info key={label} label={label} value={value} />
              ))}
            </div>
          </section>

          <section className="rounded-lg border border-line bg-surface-1 p-5">
            <h2 className="font-black text-ink-1">Projects</h2>
            <div className="mt-4 grid gap-4">
              {projects.map(project => (
                <article key={project.title} className="border-l-4 border-forest bg-surface-0 p-4">
                  <h3 className="font-black text-ink-1">{project.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-ink-2">{project.detail}</p>
                  <p className="mt-2 text-xs font-semibold text-ink-3">{project.stack}</p>
                </article>
              ))}
            </div>
          </section>

          <section className="rounded-lg border border-line bg-surface-1 p-5">
            <h2 className="flex items-center gap-2 font-black text-ink-1">
              <GraduationCap className="h-5 w-5 text-forest" />
              Education
            </h2>
            <div className="mt-4 grid gap-3 text-sm text-ink-2">
              <Info label="Bachelor of Technology" value="Computer Science, Trinity Institute of Technology & Research, Bhopal, 2022" />
              <Info label="12th" value="Math Science, MP Board, 2018" />
              <Info label="10th" value="MP Board, 2016" />
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-line bg-surface-0 p-3">
      <p className="text-xs font-bold uppercase text-ink-3">{label}</p>
      <p className="mt-1 text-sm text-ink-1">{value}</p>
    </div>
  )
}

export default Profile
