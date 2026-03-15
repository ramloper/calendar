'use client'

import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useTags, useCreateTag } from '@/hooks/useTags'
import { TagBadge } from './TagBadge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Plus, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

interface TagSelectorProps {
  userId: string
  selectedTagIds: string[]
  onTagsChange: (tagIds: string[]) => void
}

/**
 * 일정 폼에서 태그를 선택하는 UI
 * - 기존 태그 목록 표시
 * - 다중 선택
 * - 새 태그 생성
 */
export function TagSelector({ userId, selectedTagIds, onTagsChange }: TagSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [newTagName, setNewTagName] = useState('')
  const [newTagColor, setNewTagColor] = useState('#007AFF')
  const [triggerRect, setTriggerRect] = useState<DOMRect | null>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const { data: allTags = [] } = useTags(userId)
  const createTag = useCreateTag(userId)

  const selectedTags = allTags.filter((t) => selectedTagIds.includes(t.id))
  const unselectedTags = allTags.filter((t) => !selectedTagIds.includes(t.id))

  const handleToggleTag = (tagId: string) => {
    if (selectedTagIds.includes(tagId)) {
      onTagsChange(selectedTagIds.filter((id) => id !== tagId))
    } else {
      onTagsChange([...selectedTagIds, tagId])
    }
  }

  const handleCreateTag = async () => {
    if (!newTagName.trim()) return
    try {
      await createTag.mutateAsync({
        name: newTagName,
        color: newTagColor,
      })
      setNewTagName('')
      setNewTagColor('#007AFF')
    } catch (error) {
      console.error('Failed to create tag:', error)
    }
  }

  const handleOpen = () => {
    if (triggerRef.current) {
      setTriggerRect(triggerRef.current.getBoundingClientRect())
    }
    setIsOpen(true)
  }

  // 외부 클릭 감지
  useEffect(() => {
    if (!isOpen) return

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      // 드롭다운 또는 트리거 버튼 내부 클릭이면 유지
      if (triggerRef.current?.contains(target)) return
      setIsOpen(false)
    }

    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [isOpen])

  return (
    <div className="space-y-2">
      <Label className="font-medium">태그</Label>

      <div className="relative" onClick={(e) => e.stopPropagation()}>
        <button
          ref={triggerRef}
          onClick={(e) => {
            e.stopPropagation()
            handleOpen()
          }}
          className="w-full px-3 py-2 rounded-lg border border-border bg-background hover:bg-accent transition-colors flex items-center justify-between text-left text-sm"
        >
          <div className="flex gap-1 flex-wrap">
            {selectedTags.length > 0 ? (
              selectedTags.map((tag) => (
                <TagBadge
                  key={tag.id}
                  tag={tag}
                  onRemove={() => handleToggleTag(tag.id)}
                />
              ))
            ) : (
              <span className="text-muted-foreground">태그를 선택하세요</span>
            )}
          </div>
          <ChevronDown className={cn('w-4 h-4 transition-transform', isOpen && 'rotate-180')} />
        </button>

        {isOpen && triggerRect && createPortal(
          <div
            className="fixed bg-background border border-border rounded-lg shadow-lg z-[9999] w-full"
            style={{
              top: `${triggerRect.bottom + 8}px`,
              left: `${triggerRect.left}px`,
              width: `${triggerRect.width}px`,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* 기존 태그 */}
            {unselectedTags.length > 0 && (
              <div className="p-3 space-y-1.5 border-b border-border">
                {unselectedTags.map((tag) => (
                  <button
                    key={tag.id}
                    onClick={(e) => {
                      e.stopPropagation()
                      handleToggleTag(tag.id)
                    }}
                    className="w-full flex items-center gap-2 p-2 hover:bg-accent rounded-lg transition-colors text-sm"
                  >
                    <div className="w-3 h-3 rounded-full border border-border" />
                    <TagBadge tag={tag} />
                  </button>
                ))}
              </div>
            )}

            {/* 새 태그 생성 */}
            <div className="p-3 space-y-2 border-t border-border">
              <div className="flex gap-2">
                <input
                  type="color"
                  value={newTagColor}
                  onChange={(e) => setNewTagColor(e.target.value)}
                  className="w-8 h-8 rounded cursor-pointer"
                />
                <Input
                  placeholder="새 태그 이름..."
                  value={newTagName}
                  onChange={(e) => setNewTagName(e.target.value)}
                  onKeyDown={(e) => {
                    e.key === 'Enter' && handleCreateTag()
                  }}
                  className="text-sm h-8"
                />
              </div>
              <Button
                onClick={handleCreateTag}
                disabled={!newTagName.trim() || createTag.isPending}
                size="sm"
                className="w-full text-xs"
                variant="outline"
              >
                <Plus className="w-3 h-3 mr-1" />
                태그 추가
              </Button>
            </div>

            {allTags.length === 0 && newTagName === '' && (
              <div className="p-3 text-center text-xs text-muted-foreground">
                태그가 없습니다
              </div>
            )}
          </div>,
          document.body
        )}
      </div>
    </div>
  )
}
