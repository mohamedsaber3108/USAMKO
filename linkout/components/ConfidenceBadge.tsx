interface ConfidenceBadgeProps {
  score: number | null
}

export default function ConfidenceBadge({ score }: ConfidenceBadgeProps) {
  let label: string
  let bgColor: string

  if (score === null) {
    label = 'Unknown'
    bgColor = '#94A3B8'
  } else if (score >= 90) {
    label = 'Verified'
    bgColor = '#16A34A'
  } else if (score >= 70) {
    label = 'Likely'
    bgColor = '#2563EB'
  } else if (score >= 50) {
    label = 'Possible'
    bgColor = '#D97706'
  } else {
    label = 'Uncertain'
    bgColor = '#DC2626'
  }

  return (
    <span
      className="rounded-full px-3 py-1 text-xs font-semibold text-white"
      style={{ backgroundColor: bgColor }}
    >
      {score !== null && `${score} · `}{label}
    </span>
  )
}
