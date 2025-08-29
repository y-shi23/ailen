
import { motion } from 'framer-motion';
import WordDetail from '@/components/WordDetail';
import { useLocation, useNavigate } from 'react-router-dom';
import { Star, Search, BookOpen, PenTool } from 'lucide-react';
import React, { useEffect, useState } from 'react';
const Favorites = () => {
  const [favorites, setFavorites] = useState({});
  const [searchTerm, setSearchTerm] = useState('');
  const [wordData, setWordData] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const storedFavorites = JSON.parse(localStorage.getItem('favorites') || '{}');
    setFavorites(storedFavorites);
  }, []);

  const filteredFavorites = Object.keys(favorites).filter(word => 
    word.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleWordClick = (word) => {
    // 传递单词数据到首页进行显示
    localStorage.setItem('selectedWord', word);
    navigate('/');
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
    const updatedFavorites = {
      ...favorites,
      [updatedWordData.word]: updatedWordData
    };
    localStorage.setItem('favorites', JSON.stringify(updatedFavorites));
    setFavorites(updatedFavorites);
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
      </div>

      {/* 主内容区 */}
      <div className="flex-1 bg-gradient-to-br from-blue-50 to-indigo-100 p-4 overflow-hidden flex flex-col">
        <div className="h-full flex flex-col w-[80%] mx-auto">
          {/* 标题区域移到左上角 */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8 mt-4"
          >
            <div className="flex items-center gap-2">
              <Star className="text-yellow-500" fill="currentColor" />
              <h1 className="text-3xl font-bold text-gray-800">我的收藏</h1>
            </div>
            <p className="text-gray-600 mt-1">您收藏的所有单词</p>
          </motion.div>

          {Object.keys(favorites).length > 0 ? (
            <>
              {/* 搜索栏 */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-6"
              >
                <div className="relative max-w-2xl mx-auto">
                  <Search 
                    className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" 
                    size={20} 
                  />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="搜索收藏的单词..."
                    className="w-full pl-12 pr-4 py-3 rounded-2xl border border-gray-200 bg-white/80 backdrop-blur-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </motion.div>

              <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar pr-2">
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pb-4"
                >
                {filteredFavorites.map((word, index) => (
                  <motion.div
                    key={word}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    onClick={() => setWordData(favorites[word])}
                    className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-lg p-6 cursor-pointer hover:shadow-xl transition-shadow border border-white/20 relative"
                  >
                    <div className="flex justify-between items-start">
                      <h2 className="text-2xl font-bold text-gray-800">{word}</h2>
                      <Star className="text-yellow-500" fill="currentColor" size={20} />
                    </div>
                  </motion.div>
                ))}
                </motion.div>
              </div>
            </>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-lg p-12 text-center"
            >
              <Star size={48} className="text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-600 mb-2">暂无收藏</h3>
              <p className="text-gray-500">您还没有收藏任何单词，快去搜索并收藏一些单词吧！</p>
            </motion.div>
          )}
        </div>
      </div>
      
      {/* 单词详情弹窗 */}
      {wordData && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50"
          onClick={(e) => {
            // 只有点击背景层才关闭，避免点击卡片内容时关闭
            if (e.target === e.currentTarget) {
              setWordData(null);
            }
          }}
        >
          <div className="bg-white/95 backdrop-blur-lg rounded-2xl shadow-xl max-w-3xl w-full border border-white/40 relative flex flex-col max-h-[90vh]">
            <button 
              onClick={() => setWordData(null)}
              className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 transition-colors z-10"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <div className="overflow-y-auto p-8 custom-scrollbar no-scrollbar">
              <WordDetail wordData={wordData} onWordDataUpdate={handleWordDataUpdate} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Favorites;
