import { CONTACT_INFO, PERSONAL_INFO, RESUME_FILES } from '../constants'

const resumeText = `${PERSONAL_INFO.NAME}
${PERSONAL_INFO.ROLE}
${PERSONAL_INFO.TAGLINE}

Contact
Email: ${CONTACT_INFO.EMAIL}
Phone: ${CONTACT_INFO.PHONE}
Location: ${CONTACT_INFO.LOCATION}

Summary
Experienced software engineer with 3+ years building user-friendly interfaces and modern web applications with React, Angular, TypeScript, Node.js, and supporting web technologies.

Experience
Asite Solutions Pvt Ltd - Associate Software Engineer - I
Ahmedabad | 2022 - Present

Skills
JavaScript, TypeScript, HTML, CSS, SCSS, Angular, React, Node.js, Bootstrap, Tailwind CSS, Git, Jira, Bitbucket, debugging, and frontend performance work.

Projects
OrganizeSwift - Task management platform built with Angular, TypeScript, Node.js, ng-bootstrap, SCSS, Angular Material, Bootstrap, and HTML.
InstantNotes - MERN note-taking application using React, Node.js, Express.js, MongoDB, JWT, bcrypt, Bootstrap, HTML, and CSS.
CodingForum - Question and answer website using JavaScript, jQuery, MySQL, Bootstrap, XAMPP, HTML, CSS, and PHP.
`

export const downloadDefaultResume = (): void => {
  const blob = new Blob([resumeText], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = RESUME_FILES.DOWNLOAD_NAME
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
