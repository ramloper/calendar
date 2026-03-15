'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useTags, useCreateTag, useUpdateTag, useDeleteTag } from '@/hooks/useTags'
import { TagBadge } from './TagBadge'
import { Plus, Edit2, Trash2 } from 'lucide-react'

interface TagSettingsModalProps {
  userId: string
  isOpen: boolean
  onOpenChange: (open: boolean) => void
}

/**
 * 태그 관리 모달
 * - 기존 태그 목록 표시
 * - 태그 생성/편집/삭제
 */
export function TagSettingsModal({ userId, isOpen, onOpenChange }: TagSettingsModalProps) {
  const { data: tags = [], isLoading } = useTags(userId)
  const createTag = useCreateTag(userId)
  const updateTag = useUpdateTag(userId)
  const deleteTag = useDeleteTag(userId)

  const [editingId, setEditingId] = useState<string | null>(null)
  const [newName, setNewName] = useState('')
  const [newColor, setNewColor] = useState('#007AFF')
  const [newEmoji, setNewEmoji] = useState('')

  const handleCreate = async () => {
    if (!newName.trim()) return
    try {
      await createTag.mutateAsync({
        name: newName,
        color: newColor,
        emoji: newEmoji || undefined,
      })
      setNewName('')
      setNewColor('#007AFF')
      setNewEmoji('')
    } catch (error) {
      console.error('Failed to create tag:', error)
    }
  }

  const handleUpdate = async (tagId: string) => {
    if (!newName.trim()) return
    try {
      await updateTag.mutateAsync({
        tagId,
        updates: {
          name: newName,
          color: newColor,
          emoji: newEmoji || undefined,
        },
      })
      setEditingId(null)
      setNewName('')
      setNewColor('#007AFF')
      setNewEmoji('')
    } catch (error) {
      console.error('Failed to update tag:', error)
    }
  }

  const handleDelete = async (tagId: string) => {
    if (confirm('이 태그를 삭제하시겠습니까?')) {
      try {
        await deleteTag.mutateAsync(tagId)
      } catch (error) {
        console.error('Failed to delete tag:', error)
      }
    }
  }

  const startEdit = (tag: any) => {
    setEditingId(tag.id)
    setNewName(tag.name)
    setNewColor(tag.color)
    setNewEmoji(tag.emoji || '')
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>태그 관리</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 max-h-[60vh] overflow-y-auto">
          {/* 태그 목록 */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold text-muted-foreground">기존 태그</Label>
            {isLoading ? (
              <div className="flex justify-center py-4">
                <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : tags.length === 0 ? (
              <p className="text-xs text-muted-foreground py-2">태그가 없습니다</p>
            ) : (
              <div className="space-y-1.5">
                {tags.map((tag) => (
                  <div
                    key={tag.id}
                    className="flex items-center justify-between p-2 rounded-lg border border-border hover:bg-accent transition-colors"
                  >
                    <TagBadge tag={tag} />
                    <div className="flex gap-1">
                      <button
                        onClick={() => startEdit(tag)}
                        className="p-1.5 hover:bg-accent rounded transition-colors"
                      >
                        <Edit2 className="w-4 h-4 text-muted-foreground" />
                      </button>
                      <button
                        onClick={() => handleDelete(tag.id)}
                        className="p-1.5 hover:bg-red-100 dark:hover:bg-red-900/20 rounded transition-colors"
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 태그 생성/편집 폼 */}
          <div className="border-t border-border pt-4 space-y-3">
            <Label className="text-xs font-semibold text-muted-foreground">
              {editingId ? '태그 편집' : '새 태그 생성'}
            </Label>

            <div className="flex gap-2">
              <input
                type="color"
                value={newColor}
                onChange={(e) => setNewColor(e.target.value)}
                className="w-10 h-10 rounded cursor-pointer border border-border"
              />
              <div className="flex-1 space-y-1">
                <Input
                  placeholder="태그 이름..."
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="text-sm h-9"
                />
                <Input
                  placeholder="이모지 (선택사항)"
                  maxLength={2}
                  value={newEmoji}
                  onChange={(e) => setNewEmoji(e.target.value)}
                  className="text-sm h-9"
                />
              </div>
            </div>

            <Button
              onClick={() =>
                editingId ? handleUpdate(editingId) : handleCreate()
              }
              disabled={!newName.trim()}
              className="w-full text-sm"
            >
              {editingId ? (
                <>
                  <Edit2 className="w-3 h-3 mr-1" />
                  수정
                </>
              ) : (
                <>
                  <Plus className="w-3 h-3 mr-1" />
                  추가
                </>
              )}
            </Button>

            {editingId && (
              <Button
                onClick={() => {
                  setEditingId(null)
                  setNewName('')
                  setNewColor('#007AFF')
                  setNewEmoji('')
                }}
                variant="outline"
                className="w-full text-sm"
              >
                취소
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
