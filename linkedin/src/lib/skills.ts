// Limits shared by the UI and the MSW mock; the Go API enforces the same values.
export const MAX_SKILLS = 50
export const MAX_PINNED_SKILLS = 3
export const MAX_SKILL_NAME_LENGTH = 80

/** Collapses whitespace so "  React   Native " and "React Native" are the same skill. */
export function normalizeSkillName(name: string) {
  return name.trim().replace(/\s+/g, ' ')
}

/** Fixed list used for "Add skill" autocomplete. */
export const SKILL_SUGGESTIONS = [
  'Accessibility',
  'Agile',
  'Amazon Web Services (AWS)',
  'Brand Strategy',
  'Business Development',
  'C++',
  'Communication',
  'Content Strategy',
  'Customer Success',
  'Data Analysis',
  'Data Visualization',
  'Design Systems',
  'Digital Marketing',
  'Docker',
  'Engineering Management',
  'Entrepreneurship',
  'Figma',
  'Financial Modeling',
  'Fundraising',
  'Go (Programming Language)',
  'GraphQL',
  'Java',
  'JavaScript',
  'Kubernetes',
  'Leadership',
  'Machine Learning',
  'Market Research',
  'Negotiation',
  'Node.js',
  'Product Management',
  'Product Roadmapping',
  'Product Strategy',
  'Project Management',
  'Public Speaking',
  'Python',
  'React',
  'Recruiting',
  'Redis',
  'SQL',
  'Scrum',
  'Stakeholder Management',
  'Talent Acquisition',
  'Team Leadership',
  'TypeScript',
  'User Experience (UX)',
  'User Research',
]
