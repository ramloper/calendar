'use client'

import { useState } from 'react'
import { Plus, X, Check } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { useAuth } from '@/hooks/useAuth'
import { useTags, useCreateTag, useDeleteTag } from '@/hooks/useTags'
import { cn } from '@/lib/utils'

const TAG_COLORS = [
  '#007AFF', '#34C759', '#FF9500', '#FF3B30',
  '#AF52DE', '#FF2D55', '#5AC8FA', '#FFCC00',
  '#00C7BE', '#30B0C7',
]

interface Props {
  selectedIds: string[]
  onChange: (ids: string[]) => void
}

export function TagSelector({ selectedIds, onChange }: Props) {
  const { user } = useAuth()
  const { data: tags } = useTags(user?.uid ?? null)
  const createTag = useCreateTag(user?.uid ?? '')
  const deleteTag = useDeleteTag(user?.uid ?? '')

  const [isCreating, setIsCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [newColor, setNewColor] = useState(TAG_COLORS[0])

  const toggleTag = (tagId: string) => {
    if (selectedIds.includes(tagId)) {
      onChange(selectedIds.filter((id) => id !== tagId))
    } else {
      onChange([...selectedIds, tagId])
    }
  }

  const handleCreate = async () => {
    if (!newName.trim() || !user) return
    await createTag.mutateAsync({
      name: newName.trim(),
      color: newColor,
    })
    setNewName('')
    setNewColor(TAG_COLORS[0])
    setIsCreating(false)
  }

  const handleDelete = async (e: React.MouseEvent, tagId: string) => {
    e.stopPropagation()
    // 선택된 태그 삭제 시 선택 해제
    if (selectedIds.includes(tagId)) {
      onChange(selectedIds.filter((id) => id !== tagId))
    }
    await deleteTag.mutateAsync(tagId)
  }

  return (
    <div className="space-y-2">
      {/* 태그 목록 */}
      <div className="flex flex-wrap gap-1.5">
        {tags && tags.length > 0 ? (
          tags.map((tag) => {
            const isSelected = selectedIds.includes(tag.id)
            return (
              <div key={tag.id} className="relative group">
                <button
                  type="button"
                  onClick={() => toggleTag(tag.id)}
                  className={cn(
                    'flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all border',
                    isSelected
                      ? 'text-white border-transparent'
                      : 'bg-background border-border text-foreground hover:border-foreground/50'
                  )}
                  style={isSelected ? { backgroundColor: tag.color, borderColor: tag.color } : {}}
                >
                  <span
                    className="w-1.5 h-1.5 rounded-full shrink-0"
                    style={{ backgroundColor: isSelected ? 'rgba(255,255,255,0.7)' : tag.color }}
                  />
                  {tag.name}
                  {isSelected && <Check className="w-3 h-3" />}
                </button>

                {/* 삭제 버튼 (호버 시) */}
                <button
                  type="button"
                  onClick={(e) => handleDelete(e, tag.id)}
                  className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-muted-foreground text-background
                             items-center justify-center hidden group-hover:flex hover:bg-destructive transition-colors"
                >
                  <X className="w-2.5 h-2.5" />
                </button>
              </div>
            )
          })
        ) : (
          <p className="text-xs text-muted-foreground">태그가 없어요. 새 태그를 만들어 보세요.</p>
        )}

        {/* 새 태그 추가 버튼 */}
        {!isCreating && (
          <button
            type="button"
            onClick={() => setIsCreating(true)}
            className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs text-muted-foreground
                       border border-dashed border-border hover:border-foreground/50 hover:text-foreground transition-colors"
          >
            <Plus className="w-3 h-3" />
            새 태그
          </button>
        )}
      </div>

      {/* 태그 생성 인라인 폼 */}
      {isCreating && (
        <div className="flex items-center gap-2 p-3 rounded-xl border border-border bg-muted/30">
          <Input
            autoFocus
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') { e.preventDefault(); handleCreate() }
              if (e.key === 'Escape') setIsCreating(false)
            }}
            placeholder="태그 이름"
            className="h-7 text-xs flex-1"
          />

          {/* 색상 선택 */}
          <div className="flex gap-1">
            {TAG_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setNewColor(c)}
                className={cn(
                  'w-5 h-5 rounded-full transition-transform hover:scale-110 shrink-0',
                  newColor === c && 'ring-2 ring-offset-1 ring-foreground scale-110'
                )}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>

          {/* 확인 / 취소 */}
          <button
            type="button"
            onClick={handleCreate}
            disabled={!newName.trim() || createTag.isPending}
            className="w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center
                       hover:bg-primary/90 disabled:opacity-50 transition-colors shrink-0"
          >
            <Check className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => { setIsCreating(false); setNewName('') }}
            className="w-7 h-7 rounded-full bg-muted text-muted-foreground flex items-center justify-center
                       hover:bg-accent transition-colors shrink-0"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  )
}
