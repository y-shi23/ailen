import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import ModelSelector from './ModelSelector';

const SettingsModal = ({ isOpen, onClose }) => {
  const [apiUrl, setApiUrl] = useState(localStorage.getItem('apiUrl') || '');
  const [apiKey, setApiKey] = useState(localStorage.getItem('apiKey') || '');
  const [selectedModel, setSelectedModel] = useState(localStorage.getItem('selectedModel') || '');

  const handleSave = () => {
    localStorage.setItem('apiUrl', apiUrl);
    localStorage.setItem('apiKey', apiKey);
    localStorage.setItem('selectedModel', selectedModel);
    // 触发storage事件以便ModelSelector重新获取模型列表
    window.dispatchEvent(new Event('storage'));
    toast.success('设置已保存');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>AI 设置</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="apiUrl">API URL（需包含 /v1）</Label>
            <Input
              id="apiUrl"
              value={apiUrl}
              onChange={(e) => setApiUrl(e.target.value)}
              placeholder="例如：https://api.openai.com/v1"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="apiKey">API 密钥</Label>
            <Input
              id="apiKey"
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="请输入 API 密钥"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="model">AI 模型</Label>
            <ModelSelector 
              value={selectedModel} 
              onValueChange={setSelectedModel} 
            />
          </div>
          <Button onClick={handleSave} className="w-full">保存设置</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SettingsModal;
