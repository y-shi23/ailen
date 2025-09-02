import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import ModelSelector from './ModelSelector';
import ttsService from '@/services/ttsService';

const SettingsModal = ({ isOpen, onClose }) => {
  const [apiUrl, setApiUrl] = useState(localStorage.getItem('apiUrl') || '');
  const [apiKey, setApiKey] = useState(localStorage.getItem('apiKey') || '');
  const [selectedModel, setSelectedModel] = useState(localStorage.getItem('selectedModel') || '');
  // STT: Groq 配置
  const [sttApiUrl, setSttApiUrl] = useState(localStorage.getItem('sttApiUrl') || 'https://api.groq.com/openai');
  const [sttApiKey, setSttApiKey] = useState(localStorage.getItem('sttApiKey') || '');
  const [sttModel, setSttModel] = useState(localStorage.getItem('sttModel') || '');
  // TTS: 用户自定义配置（不显示内置配置）
  const [ttsApiUrl, setTtsApiUrl] = useState(localStorage.getItem('userTtsApiUrl') || '');
  const [ttsApiKey, setTtsApiKey] = useState(localStorage.getItem('userTtsApiKey') || '');
  const [ttsModel, setTtsModel] = useState(localStorage.getItem('userTtsModel') || '');
  const [ttsVoice, setTtsVoice] = useState(localStorage.getItem('userTtsVoice') || '');

  const handleSave = () => {
    localStorage.setItem('apiUrl', apiUrl);
    localStorage.setItem('apiKey', apiKey);
    localStorage.setItem('selectedModel', selectedModel);
  // STT 保存
  localStorage.setItem('sttApiUrl', sttApiUrl);
  localStorage.setItem('sttApiKey', sttApiKey);
  localStorage.setItem('sttModel', sttModel);
  // TTS 保存（只保存用户配置）
    if (ttsApiKey) {
      localStorage.setItem('userTtsApiUrl', ttsApiUrl);
      localStorage.setItem('userTtsApiKey', ttsApiKey);
      localStorage.setItem('userTtsModel', ttsModel);
      localStorage.setItem('userTtsVoice', ttsVoice);
      
      // 更新TTS服务配置
      ttsService.updateUserConfig({
        apiUrl: ttsApiUrl,
        apiKey: ttsApiKey,
        model: ttsModel,
        voice: ttsVoice
      });
    } else {
      // 如果清除了API密钥，则删除用户配置
      localStorage.removeItem('userTtsApiUrl');
      localStorage.removeItem('userTtsApiKey');
      localStorage.removeItem('userTtsModel');
      localStorage.removeItem('userTtsVoice');
      
      // 清除TTS服务的用户配置
      ttsService.clearUserConfig();
    }
    
    // 触发storage事件以便ModelSelector重新获取模型列表
    window.dispatchEvent(new Event('storage'));
    toast.success('设置已保存');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>AI 设置</DialogTitle>
        </DialogHeader>
        <div className="overflow-y-auto flex-1 pr-0 space-y-4 no-scrollbar">
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
          
          <div className="pt-4 border-t">
            <h3 className="text-sm font-semibold mb-2">语音合成（TTS）</h3>
            <p className="text-xs text-gray-500 mb-3">
              应用内置了TTS服务（如有）。您可以在此配置自定义TTS服务，留空则使用内置服务或浏览器语音。
            </p>
            <div className="space-y-2 mb-3">
              <Label htmlFor="ttsApiUrl">TTS API 基址</Label>
              <Input
                id="ttsApiUrl"
                value={ttsApiUrl}
                onChange={(e) => setTtsApiUrl(e.target.value)}
                placeholder="例如：https://api.openai.com/v1"
              />
              <p className="text-xs text-gray-500">支持OpenAI兼容的TTS服务</p>
            </div>
            <div className="space-y-2 mb-3">
              <Label htmlFor="ttsApiKey">TTS API 密钥</Label>
              <Input
                id="ttsApiKey"
                type="password"
                value={ttsApiKey}
                onChange={(e) => setTtsApiKey(e.target.value)}
                placeholder="请输入 OpenAI API Key"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="ttsModel">TTS 模型</Label>
                <Input
                  id="ttsModel"
                  value={ttsModel}
                  onChange={(e) => setTtsModel(e.target.value)}
                  placeholder="例如：tts-1"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ttsVoice">语音</Label>
                <Input
                  id="ttsVoice"
                  value={ttsVoice}
                  onChange={(e) => setTtsVoice(e.target.value)}
                  placeholder="例如：alloy"
                />
              </div>
            </div>
          </div>
        </div>
        <div className="pt-4 border-t">
          <Button onClick={handleSave} className="w-full">保存设置</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SettingsModal;
