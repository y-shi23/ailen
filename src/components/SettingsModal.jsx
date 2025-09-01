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
  // STT: Groq 配置
  const [sttApiUrl, setSttApiUrl] = useState(localStorage.getItem('sttApiUrl') || 'https://api.groq.com/openai');
  const [sttApiKey, setSttApiKey] = useState(localStorage.getItem('sttApiKey') || '');
  const [sttModel, setSttModel] = useState(localStorage.getItem('sttModel') || '');

  const handleSave = () => {
    localStorage.setItem('apiUrl', apiUrl);
    localStorage.setItem('apiKey', apiKey);
    localStorage.setItem('selectedModel', selectedModel);
  // STT 保存
  localStorage.setItem('sttApiUrl', sttApiUrl);
  localStorage.setItem('sttApiKey', sttApiKey);
  localStorage.setItem('sttModel', sttModel);
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
        apiKey={apiKey}
        apiUrl={apiUrl}
            />
          </div>
          <div className="pt-4 border-t">
            <h3 className="text-sm font-semibold mb-2">语音识别（优先使用 Groq STT）</h3>
            <div className="space-y-2 mb-3">
              <Label htmlFor="sttApiUrl">STT API 基址</Label>
              <Input
                id="sttApiUrl"
                value={sttApiUrl}
                onChange={(e) => setSttApiUrl(e.target.value)}
                placeholder="默认：https://api.groq.com/openai"
              />
              <p className="text-xs text-gray-500">将自动拼接 /v1/audio/transcriptions 与 /v1/audio/translations</p>
            </div>
            <div className="space-y-2 mb-3">
              <Label htmlFor="sttApiKey">STT API 密钥</Label>
              <Input
                id="sttApiKey"
                type="password"
                value={sttApiKey}
                onChange={(e) => setSttApiKey(e.target.value)}
                placeholder="请输入 Groq API Key"
              />
            </div>
            <div className="space-y-2 mb-3">
              <Label htmlFor="sttModel">STT 模型</Label>
              <Input
                id="sttModel"
                value={sttModel}
                onChange={(e) => setSttModel(e.target.value)}
                placeholder="例如：whisper-large-v3-turbo"
              />
            </div>
          </div>

          <Button onClick={handleSave} className="w-full">保存设置</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SettingsModal;
