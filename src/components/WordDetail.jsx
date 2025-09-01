
import { motion } from 'framer-motion';
import EditWordCard from './EditWordCard';
import { Volume2, Edit3, RefreshCcw } from 'lucide-react';
import { toast } from 'sonner';
import { SYSTEM_PROMPT } from '@/lib/dictionaryPrompt';
import React, { useState } from 'react';
const WordDetail = ({ wordData, onWordDataUpdate }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  
  if (!wordData) return null;

  const text = wordData.rawText || '';
  
  // Parse the word information from the raw text
  const parseWordInfo = (rawText) => {
    const lines = rawText.split('\n');
    const firstLine = lines[0] || '';
    
    // Extract word, phonetic, and inflections using regex
    const match = firstLine.match(/^(.+?)\s+\/(.+?)\/\s*(?:\((.+?)\))?$/);
    
    if (match) {
      return {
        word: match[1].trim(),
        phonetic: match[2].trim(),
        inflections: match[3] ? match[3].trim() : ''
      };
    }
    
    // Fallback for Chinese words or other formats
    return {
      word: wordData.word,
      phonetic: '',
      inflections: ''
    };
  };

  const wordInfo = parseWordInfo(text);
  
  // Function to play audio using Youdao API
  const playAudio = () => {
    const audioUrl = `http://dict.youdao.com/dictvoice?audio=${encodeURIComponent(wordData.word)}`;
    const audio = new Audio(audioUrl);
    audio.play().catch(error => {
      console.error('Audio playback failed:', error);
    });
  };

  // Get the remaining content (excluding the first line)
  const remainingContent = text.split('\n').slice(1).join('\n');

  const handleSaveEdit = (updatedWordData) => {
    setIsEditing(false);
    if (onWordDataUpdate) {
      onWordDataUpdate(updatedWordData);
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
  };

  const handleRegenerate = async () => {
    if (!wordData?.word) return;
    // 获取API配置
    const apiKey = localStorage.getItem('apiKey');
    const apiUrl = localStorage.getItem('apiUrl');
    const selectedModel = localStorage.getItem('selectedModel');
    if (!apiKey || !apiUrl || !selectedModel) {
      toast.error('请先在设置中配置API信息');
      return;
    }
    if (!/\/v1(\/?$|\/)/.test(apiUrl)) {
      toast.error('API URL 需包含 /v1，例如：https://api.openai.com/v1');
      return;
    }

    setRegenerating(true);
    try {
      const baseUrl = apiUrl.replace(/\/$/, '');
      const response = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: selectedModel,
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: wordData.word }
          ],
          temperature: 0.3,
          max_tokens: 1000
        })
      });
      if (!response.ok) {
        const errorData = await response.text();
        console.error('Regenerate API Error Response:', errorData);
        throw new Error(`API请求失败: ${response.status} ${response.statusText}`);
      }
      const data = await response.json();
      const aiResponse = (data.choices?.[0]?.message?.content || '').trim();
      const isEmpty = !aiResponse || aiResponse.toLowerCase() === 'error';
      if (isEmpty) {
        toast.error('AI 返回内容为空，未更新单词卡片');
        return;
      }
      const updatedWordData = { ...wordData, rawText: aiResponse };
      onWordDataUpdate?.(updatedWordData);
      toast.success('已重新生成');
    } catch (err) {
      console.error('Regenerate failed:', err);
      toast.error('重新生成失败：' + (err.message || '未知错误'));
    } finally {
      setRegenerating(false);
    }
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-bold text-gray-800">{wordInfo.word}</h1>
            {wordInfo.phonetic && (
              <div className="flex items-center gap-2">
                <span className="text-gray-600 text-lg">/{wordInfo.phonetic}/</span>
                <button
                  onClick={playAudio}
                  className="p-2 rounded-full hover:bg-gray-100 transition-colors group"
                  title="播放发音"
                >
                  <Volume2 className="text-gray-500 group-hover:text-blue-500 transition-colors" size={18} />
                </button>
              </div>
            )}
          </div>
          {wordInfo.inflections && (
            <p className="text-gray-500 text-sm">({wordInfo.inflections})</p>
          )}
        </div>
        <pre className="whitespace-pre-wrap break-words text-gray-800 text-lg leading-7">{remainingContent}</pre>
        {/* 右下角按钮区域：上方重新生成，下方编辑 */}
        <div className="absolute bottom-4 right-4 flex flex-col items-end gap-2">
          <button
            onClick={handleRegenerate}
            disabled={regenerating}
            className="p-2 rounded-full hover:bg-gray-100 transition-colors group disabled:opacity-50"
            title="重新生成"
          >
            <RefreshCcw className="text-gray-500 group-hover:text-blue-500 transition-colors" size={18} />
          </button>
          <button
            onClick={() => setIsEditing(true)}
            className="p-2 rounded-full hover:bg-gray-100 transition-colors group"
            title="编辑单词卡片"
          >
            <Edit3 className="text-gray-500 group-hover:text-blue-500 transition-colors" size={18} />
          </button>
        </div>
      </motion.div>
      
      {isEditing && (
        <EditWordCard 
          wordData={wordData} 
          onSave={handleSaveEdit} 
          onCancel={handleCancelEdit} 
        />
      )}
    </>
  );
};

export default WordDetail;
