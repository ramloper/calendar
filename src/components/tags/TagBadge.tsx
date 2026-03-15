import { cn } from '@/lib/utils'
import { X } from 'lucide-react'
import type { Tag } from '@/types'

interface TagBadgeProps {
  tag: Tag
  onRemove?: () => void
  clickable?: boolean
}

/**
 * 태그를 배지 형태로 표시
 * - 색상 + 이모지 + 이름
 * - 선택 불가한 용도(캘린더 표시)와 선택 가능한 용도(폼) 모두 지원
 */
export function TagBadge({ tag, onRemove, clickable = false }: TagBadgeProps) {
  const bgColor = tag.color || '#007AFF'

  return (
    <div
      className={cn(
        'inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap',
        clickable && 'cursor-pointer hover:opacity-80 transition-opacity'
      )}
      style={{
        backgroundColor: bgColor + '20',
        color: bgColor,
        border: `1px solid ${bgColor}`,
      }}
    >
      {tag.emoji && <span>{tag.emoji}</span>}
      <span>{tag.name}</span>
      {onRemove && (
        <button
          onClick={(e) => {
            e.stopPropagation()
            onRemove()
          }}
          className="ml-1 hover:opacity-70 transition-opacity"
        >
          <X className="w-3 h-3" />
        </button>
      )}
    </div>
  )
}
