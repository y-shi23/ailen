import React, { useState, useEffect, useRef } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectSeparator } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

const ModelSelector = ({ value, onValueChange, apiKey: apiKeyProp, apiUrl: apiUrlProp }) => {
  const [models, setModels] = useState([]);
  const [loading, setLoading] = useState(false);
  // 优先使用 props，其次回退到 localStorage
  const [apiKey, setApiKey] = useState(apiKeyProp ?? (localStorage.getItem('apiKey') || ''));
  const [apiUrl, setApiUrl] = useState(apiUrlProp ?? (localStorage.getItem('apiUrl') || ''));
  const debounceTimerRef = useRef(null);
  const selectValue = models.includes(value) ? value : undefined;
  const [open, setOpen] = useState(false);
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [customDraft, setCustomDraft] = useState(value && !models.includes(value) ? value : '');
  const customInputRef = useRef(null);

  // 监听localStorage变化
  useEffect(() => {
    const handleStorageChange = () => {
      // 若未通过 props 传入，则同步本地存储
      if (apiKeyProp === undefined) {
        setApiKey(localStorage.getItem('apiKey') || '');
      }
      if (apiUrlProp === undefined) {
        setApiUrl(localStorage.getItem('apiUrl') || '');
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [apiKeyProp, apiUrlProp]);

  // 监听 props 变化（来自设置面板内输入时立即更新）
  useEffect(() => {
    if (apiKeyProp !== undefined) setApiKey(apiKeyProp);
  }, [apiKeyProp]);

  useEffect(() => {
    if (apiUrlProp !== undefined) setApiUrl(apiUrlProp);
  }, [apiUrlProp]);

  useEffect(() => {
    const fetchModels = async () => {
      if (!apiKey || !apiUrl) return;
      if (!/\/v1(\/?$|\/)/.test(apiUrl)) {
        // 仅在用户已输入 URL 但格式不含 /v1 时提示
        if (apiUrl?.length > 0) {
          toast.error('API URL 需包含 /v1，例如：https://api.openai.com/v1');
        }
        return;
      }

      setLoading(true);
      try {
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

        const availableModels = (data.data || [])
          .filter(model =>
            typeof model?.id === 'string' && (
              model.id.startsWith('gpt') ||
              model.id.startsWith('claude') ||
              model.id.startsWith('gemini') ||
              model.id.startsWith('moonshot')
            )
          )
          .map(model => model.id);
        setModels(availableModels);
      } catch (error) {
        toast.error('获取模型列表失败: ' + error.message);
        console.error('获取模型列表失败:', error);
      } finally {
        setLoading(false);
      }
    };

    // 防抖，避免用户输入时频繁请求
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      fetchModels();
    }, 400);

    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, [apiKey, apiUrl]);

  const handleSelectChange = (v) => {
    setShowCustomInput(false);
    onValueChange(v);
  };

  const confirmCustom = () => {
    const v = (customDraft || '').trim();
    if (!v) return;
    onValueChange(v);
    setShowCustomInput(false);
    setOpen(false);
  };

  const cancelCustom = () => {
    setShowCustomInput(false);
  };

  const handleShowCustom = () => {
    setShowCustomInput(true);
    setCustomDraft(value && !models.includes(value) ? value : '');
    setOpen(true);
    setTimeout(() => customInputRef.current?.focus(), 0);
  };

  return (
    <div className="space-y-2">
      <Select
        value={selectValue}
        onValueChange={handleSelectChange}
        disabled={loading}
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) setShowCustomInput(false);
        }}
      >
        <SelectTrigger className="w-full">
          <SelectValue placeholder={loading ? "加载模型中..." : "选择模型（可选）"}>
            {value || (loading ? "加载模型中..." : "选择模型（可选）")}
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
          {/* 自定义模型名入口始终位于底部 */}
          <SelectSeparator />
          {!showCustomInput && (
            <button
              type="button"
              className="relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-left text-sm outline-none hover:bg-accent hover:text-accent-foreground"
              onMouseDown={(e) => e.preventDefault()}
              onClick={handleShowCustom}
            >
              自定义模型名...
            </button>
          )}
          {showCustomInput && (
            <div className="p-2 space-y-2">
              <Input
                ref={customInputRef}
                value={customDraft}
                onChange={(e) => setCustomDraft(e.target.value)}
                placeholder="输入完整模型名，如 gpt-4o-mini / claude-3-5-sonnet"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    confirmCustom();
                  } else if (e.key === 'Escape') {
                    e.preventDefault();
                    cancelCustom();
                  }
                }}
              />
              <div className="flex gap-2">
                <Button size="sm" onClick={confirmCustom}>
                  确认
                </Button>
                <Button size="sm" variant="outline" onClick={cancelCustom}>
                  取消
                </Button>
              </div>
            </div>
          )}
        </SelectContent>
      </Select>
      {value && !models.includes(value) && (
        <p className="text-xs text-muted-foreground">已使用自定义模型：{value}</p>
      )}
    </div>
  );
};

export default ModelSelector;
