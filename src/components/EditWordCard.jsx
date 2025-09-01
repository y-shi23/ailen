import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';

const EditWordCard = ({ wordData, onSave, onCancel }) => {
  const [editedText, setEditedText] = useState(wordData.rawText || '');

  const handleSave = () => {
    // 更新单词数据
    const updatedWordData = {
      ...wordData,
      rawText: editedText
    };
    
    // 保存到本地存储
    const favorites = JSON.parse(localStorage.getItem('favorites') || '{}');
    if (favorites[wordData.word]) {
      favorites[wordData.word] = updatedWordData;
      localStorage.setItem('favorites', JSON.stringify(favorites));
    }
    
    onSave(updatedWordData);
  };

  return (
    <Dialog open={true} onOpenChange={onCancel}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>编辑单词卡片</DialogTitle>
        </DialogHeader>
        <div className="py-4">
          <Textarea
            value={editedText}
            onChange={(e) => setEditedText(e.target.value)}
            className="min-h-[300px] font-mono text-sm"
            placeholder="编辑单词信息..."
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>取消</Button>
          <Button onClick={handleSave}>保存</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default EditWordCard;
