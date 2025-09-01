import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RotateCcw, ArrowLeft, ArrowRight, ThumbsUp, ThumbsDown, Search, Star, PenTool, BookOpen, MessageCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate, useLocation } from 'react-router-dom';
import WordDetail from '@/components/WordDetail';

const Flashcards = () => {
  const [cards, setCards] = useState([]);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [familiarity, setFamiliarity] = useState({});
  const [reviewDates, setReviewDates] = useState({});
  const [sessionFamiliarCount, setSessionFamiliarCount] = useState({}); // 本次学习中每个词已被标记熟悉的次数
  const [history, setHistory] = useState([]); // 记录浏览历史用于返回上一张
  const [showWordDetail, setShowWordDetail] = useState(false);
  const [currentWordData, setCurrentWordData] = useState(null);
  const [sessionWords, setSessionWords] = useState([]); // 今日会话的初始词集合
  const navigate = useNavigate();
  const location = useLocation();

  // 闪卡翻转动画
  const flipCard = useCallback(() => {
    if (!isFlipped && cards[currentCardIndex]) {
      // 从收藏中获取完整的单词数据
      const favorites = JSON.parse(localStorage.getItem('favorites') || '{}');
      const word = cards[currentCardIndex].word;
      if (favorites[word]) {
        setCurrentWordData(favorites[word]);
        setShowWordDetail(true);
      }
    } else {
      setShowWordDetail(false);
    }
    setIsFlipped(!isFlipped);
  }, [isFlipped, cards, currentCardIndex]);

  // 导航到上一张卡片
  const previousCard = useCallback(() => {
    if (history.length > 0) {
      const last = history[history.length - 1];
      setHistory(prev => prev.slice(0, -1));
      setCurrentCardIndex(last);
      setIsFlipped(false);
      setShowWordDetail(false);
    }
  }, [history]);

  // 导航到下一张卡片
  const nextCard = useCallback(() => {
    if (cards.length === 0) return;
    // 记录历史
    setHistory(prev => [...prev, currentCardIndex]);
    if (cards.length === 1) {
      setIsFlipped(false);
      setShowWordDetail(false);
      return; // 只有一个卡片，保持当前
    }
    let nextIdx = Math.floor(Math.random() * cards.length);
    // 避免重复命中当前卡片
    if (nextIdx === currentCardIndex) {
      nextIdx = (nextIdx + 1) % cards.length;
    }
    setCurrentCardIndex(nextIdx);
    setIsFlipped(false);
    setShowWordDetail(false);
  }, [cards.length, currentCardIndex]);

  // 标记熟悉程度
  const markFamiliarity = useCallback((isFamiliar) => {
    if (cards.length === 0) return;
    const currentWord = cards[currentCardIndex].word;

    // 记录最近一次标记熟悉/不熟
    const newFamiliarity = { ...familiarity, [currentWord]: isFamiliar };
    setFamiliarity(newFamiliarity);
    localStorage.setItem('flashcardFamiliarity', JSON.stringify(newFamiliarity));

    // 从本地取出累计复习轮次（用于艾宾浩斯间隔推进）
    const reviewCountMap = JSON.parse(localStorage.getItem('flashcardReviewCount') || '{}');
    const currentCount = reviewCountMap[currentWord] || 0;

    // 会话内计数
    const sessionCount = sessionFamiliarCount[currentWord] || 0;

    if (isFamiliar) {
      const nextSessionCount = sessionCount + 1;
      const updatedSession = { ...sessionFamiliarCount, [currentWord]: nextSessionCount };
      setSessionFamiliarCount(updatedSession);

      if (nextSessionCount >= 3) {
        // 达到3次熟悉：按艾宾浩斯推进间隔，计算下次复习时间
        const nextDate = calculateNextReviewDateWithCount(currentWord, true, currentCount);
        const newReviewDates = { ...reviewDates, [currentWord]: nextDate };
        setReviewDates(newReviewDates);
        localStorage.setItem('flashcardReviewDates', JSON.stringify(newReviewDates));

        // 推进累计复习轮次
        reviewCountMap[currentWord] = currentCount + 1;
        localStorage.setItem('flashcardReviewCount', JSON.stringify(reviewCountMap));

        // 从当前牌堆移除该词（本轮不再出现，直到到期）
        setCards(prev => {
          const newCards = prev.filter(c => c.word !== currentWord);
          // 清理历史，避免索引错位
          setHistory([]);
          // 切到下一张（如果还有）
          setTimeout(() => {
            if (newCards.length > 0) {
              setCurrentCardIndex(Math.floor(Math.random() * newCards.length));
              setIsFlipped(false);
              setShowWordDetail(false);
            }
          }, 200);
          return newCards;
        });

        toast.success('已记住（本轮结束），下次复习时间已安排');
        return;
      } else {
        toast.success(`标记为熟悉（${nextSessionCount}/3）`);
      }
    } else {
      // 不熟：重置会话计数，安排明天复习，不推进累计轮次
      const updatedSession = { ...sessionFamiliarCount, [currentWord]: 0 };
      setSessionFamiliarCount(updatedSession);
      const nextDate = calculateNextReviewDateWithCount(currentWord, false, currentCount);
      const newReviewDates = { ...reviewDates, [currentWord]: nextDate };
      setReviewDates(newReviewDates);
      localStorage.setItem('flashcardReviewDates', JSON.stringify(newReviewDates));
      toast.error('已标记为不熟，明天复习');
    }

    // 自动切换到下一张随机卡片
    setTimeout(() => {
      nextCard();
    }, 200);
  }, [cards, currentCardIndex, familiarity, sessionFamiliarCount, reviewDates, nextCard]);

  // 计算下次复习时间
  const handleWordDataUpdate = useCallback((updatedWordData) => {
    setCurrentWordData(updatedWordData);
    
    // 更新本地缓存
    const cachedWords = JSON.parse(localStorage.getItem('cachedWords') || '{}');
    const updatedCachedWords = {
      ...cachedWords,
      [updatedWordData.word]: updatedWordData
    };
    localStorage.setItem('cachedWords', JSON.stringify(updatedCachedWords));
    
    // 更新收藏夹中的数据
    const favorites = JSON.parse(localStorage.getItem('favorites') || '{}');
    const updatedFavorites = {
      ...favorites,
      [updatedWordData.word]: updatedWordData
    };
    localStorage.setItem('favorites', JSON.stringify(updatedFavorites));
    
    // 更新当前卡片数据
    setCards(prevCards => 
      prevCards.map(card => 
        card.word === updatedWordData.word 
          ? { 
              ...card, 
              definition: updatedWordData.definition,
              example: updatedWordData.example,
              phonetic: updatedWordData.phonetic
            }
          : card
      )
    );
  }, []);

  const calculateNextReviewDateWithCount = useCallback((word, isFamiliar, reviewCount) => {
    const currentDate = new Date();
    let daysToAdd;
    if (isFamiliar) {
      const intervals = [1, 3, 7, 14, 30, 60, 90];
      daysToAdd = intervals[Math.min(reviewCount, intervals.length - 1)];
    } else {
      daysToAdd = 1; // 不熟：明天复习
    }
    const nextReviewDate = new Date(currentDate);
    nextReviewDate.setDate(nextReviewDate.getDate() + daysToAdd);
    return nextReviewDate.toISOString();
  }, []);

  // 加载收藏的单词作为闪卡
  const loadFavoriteWords = useCallback(() => {
    const favorites = JSON.parse(localStorage.getItem('favorites') || '{}');
    const savedFamiliarity = JSON.parse(localStorage.getItem('flashcardFamiliarity') || '{}');
    const savedReviewDates = JSON.parse(localStorage.getItem('flashcardReviewDates') || '{}');
    
    setFamiliarity(savedFamiliarity);
    setReviewDates(savedReviewDates);
    setSessionFamiliarCount({});
    setHistory([]);

    const now = Date.now();
    const favoriteWords = Object.keys(favorites);
    if (favoriteWords.length > 0) {
      const dueWords = favoriteWords.filter(w => {
        const d = savedReviewDates[w];
        return !d || new Date(d).getTime() <= now; // 无日期或到期
      });
  setSessionWords(dueWords);
      const cardData = dueWords.map(word => ({
        word,
        definition: favorites[word].definition || '',
        example: favorites[word].example || '',
        phonetic: favorites[word].phonetic || ''
      }));
      
      // 随机初始卡片
      setCards(cardData);
      if (cardData.length > 0) {
        setCurrentCardIndex(Math.floor(Math.random() * cardData.length));
      } else {
        setCurrentCardIndex(0);
      }
      setIsFlipped(false);
    }
  }, []);

  // 重新开始今日复习：用本次会话初始集合重建牌堆
  const restartTodaySession = useCallback(() => {
    const favorites = JSON.parse(localStorage.getItem('favorites') || '{}');
    const rebuilt = sessionWords
      .filter(word => !!favorites[word])
      .map(word => ({
        word,
        definition: favorites[word].definition || '',
        example: favorites[word].example || '',
        phonetic: favorites[word].phonetic || ''
      }));
    setCards(rebuilt);
    setSessionFamiliarCount({});
    setHistory([]);
    setIsFlipped(false);
    setShowWordDetail(false);
    if (rebuilt.length > 0) {
      setCurrentCardIndex(Math.floor(Math.random() * rebuilt.length));
      toast.message('已重新开始今日复习');
    } else {
      // 若没有本次集合，则退化为重新加载到期词
      loadFavoriteWords();
    }
  }, [sessionWords, loadFavoriteWords]);

  // 键盘事件处理
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (cards.length === 0) return;
      
      switch(e.code) {
        case 'Space':
          e.preventDefault();
          flipCard();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          previousCard();
          break;
        case 'ArrowRight':
          e.preventDefault();
          nextCard();
          break;
        case 'ArrowUp':
          e.preventDefault();
          // 上键：不熟
          markFamiliarity(false);
          break;
        case 'ArrowDown':
          e.preventDefault();
          // 下键：熟悉
          markFamiliarity(true);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [cards, flipCard, previousCard, nextCard, markFamiliarity]);

  // 初始化加载
  useEffect(() => {
    loadFavoriteWords();
  }, [loadFavoriteWords]);

  const currentCard = cards[currentCardIndex];

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
        {/* 主内容区域 */}
        <div className="flex-1 flex items-center justify-center p-6">
          {cards.length === 0 ? (
            <div className="text-center">
              <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-lg p-12">
                <h2 className="text-2xl font-semibold text-gray-600 mb-4">暂无单词</h2>
                <p className="text-gray-500 mb-6">请先在收藏页面添加一些单词到收藏夹</p>
                <div className="flex items-center justify-center gap-3">
                  <button
                    onClick={restartTodaySession}
                    className="px-4 py-2 rounded-xl bg-blue-500 hover:bg-blue-600 text-white transition-colors"
                  >
                    重新开始今日复习
                  </button>
                </div>
              </div>
            </div>
          ) : (
          <div className="w-full max-w-2xl sm:max-w-3xl md:max-w-4xl lg:max-w-5xl">
            {/* 卡片容器 */}
            <div className="relative w-full aspect-[16/10] mb-8">
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentCardIndex}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.3 }}
                  className="absolute inset-0"
                >
                  {/* 正面 - 单词 */}
                  {!isFlipped && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="w-full h-full bg-white/90 backdrop-blur-lg rounded-2xl shadow-2xl p-8 flex flex-col items-center justify-center cursor-pointer"
                      onClick={flipCard}
                    >
                      <h2 className="text-4xl sm:text-5xl md:text-6xl font-bold text-gray-800 mb-4 text-center">
                        {currentCard.word}
                      </h2>
                      {currentCard.phonetic && (
                        <p className="text-2xl sm:text-3xl text-gray-600 mb-6">
                          [{currentCard.phonetic}]
                        </p>
                      )}
                      <p className="text-gray-500 text-center">点击或按空格键查看详情</p>
                    </motion.div>
                  )}

                  {/* 背面 - 单词详情 */}
                  {isFlipped && currentWordData && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="w-full h-full bg-white/90 backdrop-blur-lg rounded-2xl shadow-2xl overflow-hidden cursor-pointer"
                      onClick={(e) => {
                        // 点击背面时，若命中按钮/链接等交互元素，则不翻转
                        if (e.target.closest('button, a, input, textarea, [role="button"], [data-no-flip]')) return;
                        flipCard();
                      }}
                    >
                      <div className="h-full flex flex-col">
                        {/* 单词详情内容 */}
                        <div className="flex-1 overflow-y-auto p-4">
                          <WordDetail 
                            wordData={currentWordData}
                            onWordDataUpdate={handleWordDataUpdate}
                          />
                        </div>
                      </div>
                    </motion.div>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>

            {/* 进度指示器 */}
            <div className="flex justify-center items-center gap-2 mb-6">
              {cards.map((_, index) => (
                <div
                  key={index}
                  className={`w-2 h-2 rounded-full transition-colors ${
                    index === currentCardIndex ? 'bg-blue-500' : 'bg-gray-300'
                  }`}
                />
              ))}
            </div>

            {/* 控制按钮 */}
            <div className="flex justify-center items-center gap-4">
              <button
                onClick={previousCard}
                disabled={history.length === 0}
                className="p-3 rounded-full bg-gray-200 hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                <ArrowLeft size={20} />
              </button>
              
              <button
                onClick={flipCard}
                className="p-3 rounded-full bg-blue-500 hover:bg-blue-600 text-white transition-all"
              >
                <RotateCcw size={20} />
              </button>
              
              <button
                onClick={nextCard}
                disabled={cards.length <= 1}
                className="p-3 rounded-full bg-gray-200 hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                <ArrowRight size={20} />
              </button>
            </div>

            {/* 熟悉度标记按钮 */}
            <div className="flex justify-center items-center gap-4 mt-6">
              <button
                onClick={() => markFamiliarity(false)}
                className="flex items-center gap-2 px-4 py-2 rounded-full bg-red-500 hover:bg-red-600 text-white transition-all"
              >
                <ThumbsDown size={16} />
                不熟悉
              </button>
              
              <button
                onClick={() => markFamiliarity(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-full bg-green-500 hover:bg-green-600 text-white transition-all"
              >
                <ThumbsUp size={16} />
                熟悉
              </button>
            </div>

            {/* 卡片信息 */}
            <div className="text-center mt-6 text-gray-600">
              {currentCardIndex + 1} / {cards.length}
            </div>
          </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Flashcards;
