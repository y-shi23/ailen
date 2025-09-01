
import { motion } from 'framer-motion';
import WordDetail from '@/components/WordDetail';
import { useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import SettingsModal from '@/components/SettingsModal';
import { PenTool, MessageCircle, Star, Search, BookOpen, Settings } from 'lucide-react';
import { SYSTEM_PROMPT } from '@/lib/dictionaryPrompt';
import React, { useEffect, useState } from 'react';
const Index = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [wordData, setWordData] = useState(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [favorites, setFavorites] = useState({});
  const navigate = useNavigate();
  const location = useLocation();

  // 初始化收藏列表
  useEffect(() => {
    const storedFavorites = JSON.parse(localStorage.getItem('favorites') || '{}');
    setFavorites(storedFavorites);
    
    // 检查是否有从收藏页面传递过来的单词
    const selectedWord = localStorage.getItem('selectedWord');
    if (selectedWord) {
      localStorage.removeItem('selectedWord');
      setSearchTerm(selectedWord);
      // 使用setTimeout确保在组件渲染后执行搜索
      setTimeout(() => {
        const fakeEvent = { preventDefault: () => {} };
        handleSearch(fakeEvent, selectedWord);
      }, 100);
    }
  }, []);

  // 更新收藏状态
  const updateFavorites = () => {
    const storedFavorites = JSON.parse(localStorage.getItem('favorites') || '{}');
    setFavorites(storedFavorites);
  };

  const handleSearch = async (e, term = searchTerm) => {
    e.preventDefault();
    if (!term.trim()) return;

    setIsLoading(true);
    setWordData(null);
    
    try {
      // 检查本地缓存中是否已有该单词的数据
      const cachedWords = JSON.parse(localStorage.getItem('cachedWords') || '{}');
      if (cachedWords[term]) {
        setWordData(cachedWords[term]);
        setIsLoading(false);
        return;
      }

      // 获取API配置
      const apiKey = localStorage.getItem('apiKey');
      const apiUrl = localStorage.getItem('apiUrl');
      const selectedModel = localStorage.getItem('selectedModel');
      const isChinese = /[\u4e00-\u9fa5]/.test(term);
      
      if (!apiKey || !apiUrl || !selectedModel) {
        toast.error('请先在设置中配置API信息');
        setIsLoading(false);
        return;
      }

      // 要求用户在 API URL 中包含 /v1
      if (!/\/v1(\/?$|\/)/.test(apiUrl)) {
        toast.error('API URL 需包含 /v1，例如：https://api.openai.com/v1');
        setIsLoading(false);
        return;
      }

  // 使用共享系统提示词

      // 调用AI API
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
            {
      role: "system",
      content: SYSTEM_PROMPT
            },
            {
              role: "user",
      content: term.trim()
            }
          ],
          temperature: 0.3,
          max_tokens: 1000
        })
      });

      if (!response.ok) {
        const errorData = await response.text();
        console.error('API Error Response:', errorData);
        throw new Error(`API请求失败: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const aiResponse = (data.choices?.[0]?.message?.content || '').trim();
      const isEmpty = !aiResponse || aiResponse.toLowerCase() === 'error';
      
      console.log('AI Response:', aiResponse); // 调试信息
      
  // 直接使用AI返回的字典文本（若为空则不缓存，仅显示占位/错误）
  const newWordData = { rawText: aiResponse, word: term };
  setWordData(newWordData);
  if (!isEmpty) {
    const updatedCachedWords = {
      ...cachedWords,
      [term]: newWordData
    };
    localStorage.setItem('cachedWords', JSON.stringify(updatedCachedWords));
  }
    } catch (error) {
      console.error('API调用错误:', error);
      toast.error('获取单词信息失败: ' + (error.message || '未知错误'));
      
      // 使用模拟数据作为后备（原始字典文本）
      const isChinese = /[\u4e00-\u9fa5]/.test(term);
      const mockRaw = isChinese
        ? `${term}\n定义1; 定义2`
        : `${term} /tɛst/ ( testing, tested, tests )\nn. brief def1; brief def2\n[ 复数 tests 第三人称单数 tests 现在分词 testing 过去式 tested 过去分词 tested ]\n1.\nV-T Detailed definition.\n例：\nExample sentence.\n示例翻译。`;
  setWordData({ rawText: mockRaw, word: term });
    } finally {
      setIsLoading(false);
    }
  };

  const toggleFavorite = () => {
    if (!wordData) return;
    
    const newFavorites = { ...favorites };
    
    if (favorites[wordData.word]) {
      delete newFavorites[wordData.word];
    } else {
      newFavorites[wordData.word] = wordData;
    }
    
    localStorage.setItem('favorites', JSON.stringify(newFavorites));
    setFavorites(newFavorites);
  };

  const handleWordDataUpdate = (updatedWordData) => {
    setWordData(updatedWordData);
    
    // 更新本地缓存
    const cachedWords = JSON.parse(localStorage.getItem('cachedWords') || '{}');
    const updatedCachedWords = {
      ...cachedWords,
      [updatedWordData.word]: updatedWordData
    };
    localStorage.setItem('cachedWords', JSON.stringify(updatedCachedWords));
    
    // 更新收藏夹中的数据
    const storedFavorites = JSON.parse(localStorage.getItem('favorites') || '{}');
    if (storedFavorites[updatedWordData.word]) {
      const updatedFavorites = {
        ...storedFavorites,
        [updatedWordData.word]: updatedWordData
      };
      localStorage.setItem('favorites', JSON.stringify(updatedFavorites));
      setFavorites(updatedFavorites);
    }
  };

  return (
    <div className="h-screen flex overflow-hidden">
      {/* 侧边栏 */}
      <div className="w-20 bg-white/80 backdrop-blur-lg shadow-lg flex flex-col items-center py-6 space-y-8 flex-shrink-0">
        <button
          onClick={() => navigate('/')}
          className={`p-3 rounded-2xl transition-colors ${location.pathname === '/' ? 'bg-blue-100 text-blue-600' : 'text-gray-500 hover:bg-gray-100'}`}
          title="搜索"
        >
          <Search size={24} />
        </button>
        <button
          onClick={() => navigate('/favorites')}
          className={`p-3 rounded-2xl transition-colors ${location.pathname === '/favorites' ? 'bg-blue-100 text-blue-600' : 'text-gray-500 hover:bg-gray-100'}`}
          title="收藏本"
        >
          <Star size={24} />
        </button>
        <button
          onClick={() => navigate('/writing')}
          className={`p-3 rounded-2xl transition-colors ${location.pathname === '/writing' ? 'bg-blue-100 text-blue-600' : 'text-gray-500 hover:bg-gray-100'}`}
          title="写作"
        >
          <PenTool size={24} />
        </button>
        <button
          onClick={() => navigate('/flashcards')}
          className={`p-3 rounded-2xl transition-colors ${location.pathname === '/flashcards' ? 'bg-blue-100 text-blue-600' : 'text-gray-500 hover:bg-gray-100'}`}
          title="闪卡"
        >
          <BookOpen size={24} />
        </button>
        {/* 添加AI对话入口 */}
        <button
          onClick={() => navigate('/ai-chat')}
          className={`p-3 rounded-2xl transition-colors ${location.pathname === '/ai-chat' ? 'bg-blue-100 text-blue-600' : 'text-gray-500 hover:bg-gray-100'}`}
          title="AI对话"
        >
          <MessageCircle size={24} />
        </button>
      </div>

      {/* 主内容区 */}
      <div className="flex-1 bg-gradient-to-br from-blue-50 to-indigo-100 p-4 overflow-hidden flex flex-col">
        <SettingsModal 
          isOpen={isSettingsOpen} 
          onClose={() => setIsSettingsOpen(false)} 
        />
        
        <button
          onClick={() => setIsSettingsOpen(true)}
          className="absolute top-6 right-6 p-2 rounded-full bg-white/80 backdrop-blur-sm shadow-md hover:bg-white transition-colors"
        >
          <Settings className="text-gray-600" size={20} />
        </button>
        
        <motion.div
          layout
          className={`w-full max-w-4xl flex flex-col items-center mx-auto ${ (wordData || isLoading) ? 'pt-6' : 'pt-[15%]' }`}
          style={{ width: '80%' }}
        >
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full mb-8 text-center"
          >
            <h1 className="text-4xl font-bold text-gray-800 mb-2">AI 词典</h1>
            <p className="text-gray-600">输入中英文单词获取 AI 生成的详细解释</p>
          </motion.div>
          
          <motion.form
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            onSubmit={handleSearch}
            className="w-full mb-8"
          >
            <div className="relative">
              <Search 
                className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" 
                size={20} 
              />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="输入中英文单词..."
                className="w-full pl-12 pr-4 py-4 rounded-2xl border border-gray-200 bg-white/80 backdrop-blur-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <button
                type="submit"
                disabled={isLoading}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-blue-500 hover:bg-blue-600 text-white rounded-xl px-6 py-2 font-medium transition-colors disabled:opacity-50"
              >
                {isLoading ? '搜索中...' : '搜索'}
              </button>
            </div>
          </motion.form>
          
          <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar flex justify-center pt-8 px-4 pb-16">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="w-full max-w-6xl mx-auto"
            >
              {wordData && (
                <div className="bg-white/95 backdrop-blur-lg rounded-2xl shadow-xl max-w-3xl w-full border border-white/40 relative flex flex-col max-h-[70vh] mx-auto">
                  {/* 收藏按钮 */}
                  <button 
                    onClick={toggleFavorite}
                    className="absolute top-4 right-4 text-yellow-400 hover:text-yellow-500 transition-colors z-10"
                  >
                    <Star 
                      fill={favorites[wordData.word] ? "currentColor" : "none"} 
                      size={24} 
                    />
                  </button>
                  <div className="overflow-y-auto p-8 custom-scrollbar no-scrollbar">
                    <WordDetail wordData={wordData} onWordDataUpdate={handleWordDataUpdate} />
                  </div>
                </div>
              )}
              
              {isLoading && (
                <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-lg p-8 w-full max-w-3xl mx-auto flex justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                </div>
              )}
            </motion.div>
          </div>
  </motion.div>
      </div>
    </div>
  );
};

export default Index;
