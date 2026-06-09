export const getDifficultyColor = (difficulty: 'Beginner' | 'Intermediate' | 'Advanced' | string): string => {
  switch (difficulty) {
    case 'Beginner':
      return 'bg-forest/10 text-forest border-forest/20'
    case 'Intermediate':
      return 'bg-sage text-forest-strong border-forest/20'
    case 'Advanced':
      return 'bg-forest text-white border-forest'
    default:
      return 'bg-surface-2 text-ink-2 border-line'
  }
}
