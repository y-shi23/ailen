import React, { useState, useEffect } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

const ModelSelector = ({ value, onValueChange }) => {
  const [models, setModels] = useState([]);
  const [loading, setLoading] = useState(false);
  const [apiKey, setApiKey] = useState(localStorage.getItem('apiKey') || '');
  const [apiUrl, setApiUrl] = useState(localStorage.getItem('apiUrl') || '');

  // 监听localStorage变化
  useEffect(() => {
    const handleStorageChange = () => {
      const newApiKey = localStorage.getItem('apiKey') || '';
      const newApiUrl = localStorage.getItem('apiUrl') || '';
      setApiKey(newApiKey);
      setApiUrl(newApiUrl);
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  useEffect(() => {
    const fetchModels = async () => {
      if (!apiKey || !apiUrl) return;
      if (!/\/v1(\/?$|\/)/.test(apiUrl)) {
        toast.error('API URL 需包含 /v1，例如：https://api.openai.com/v1');
        return;
      }
      
      setLoading(true);
      try {
        // 直接调用用户配置的 API
        const baseUrl = apiUrl.replace(/\/$/, '');
        const response = await fetch(`${baseUrl}/models`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (!response.ok) {
          const errText = await response.text().catch(() => '');
          throw new Error(`获取模型列表失败: ${response.status} ${response.statusText} ${errText ? '- ' + errText : ''}`);
        }
        
        const data = await response.json();
        
        // 过滤出可用的模型
        const availableModels = data.data
          .filter(model => model.id.startsWith('gpt') || model.id.startsWith('claude') || model.id.startsWith('gemini') || model.id.startsWith('moonshot'))
          .map(model => model.id);
        setModels(availableModels);
      } catch (error) {
        toast.error('获取模型列表失败: ' + error.message);
        console.error('获取模型列表失败:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchModels();
  }, [apiKey, apiUrl]);

  return (
    <Select value={value} onValueChange={onValueChange} disabled={loading}>
      <SelectTrigger className="w-full">
        <SelectValue placeholder={loading ? "加载模型中..." : "选择模型"}>
          {value || (loading ? "加载模型中..." : "选择模型")}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {models.map((model) => (
          <SelectItem key={model} value={model}>
            {model}
          </SelectItem>
        ))}
        {models.length === 0 && !loading && (
          <SelectItem value="none" disabled>
            未找到可用模型
          </SelectItem>
        )}
      </SelectContent>
    </Select>
  );
};

export default ModelSelector;
