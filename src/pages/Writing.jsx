
import { motion } from 'framer-motion';
import { useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { PenTool, MessageCircle, Star, Search, Calendar, BookOpen, FileText, Plus, Settings } from 'lucide-react';
import React, { useEffect, useState } from 'react';
const Writing = () => {
  const [articles, setArticles] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [articleToDelete, setArticleToDelete] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    loadArticles();
  }, []);

  const loadArticles = () => {
    const savedArticles = JSON.parse(localStorage.getItem('articles') || '[]');
    setArticles(savedArticles);
  };

  const createNewArticle = () => {
    const newArticle = {
      id: Date.now().toString(),
      title: '新文章',
      content: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      suggestions: []
    };
    
    const updatedArticles = [newArticle, ...articles];
    localStorage.setItem('articles', JSON.stringify(updatedArticles));
    setArticles(updatedArticles);
    
    navigate(`/article/${newArticle.id}`);
  };

  const openArticle = (article) => {
    navigate(`/article/${article.id}`);
  };

  const deleteArticle = (articleId, e) => {
    e.stopPropagation();
    setArticleToDelete(articleId);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (articleToDelete) {
      const updatedArticles = articles.filter(article => article.id !== articleToDelete);
      localStorage.setItem('articles', JSON.stringify(updatedArticles));
      setArticles(updatedArticles);
      toast.success('文章已删除');
      setDeleteDialogOpen(false);
      setArticleToDelete(null);
    }
  };

  const cancelDelete = () => {
    setDeleteDialogOpen(false);
    setArticleToDelete(null);
  };

  const filteredArticles = articles.filter(article =>
    article.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    article.content.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
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
        <div className="h-full flex flex-col w-[80%] mx-auto">
          {/* 标题区域移到左上角 */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8 mt-4"
          >
            <div className="flex items-center gap-2">
              <PenTool className="text-blue-600" />
              <h1 className="text-3xl font-bold text-gray-800">写作中心</h1>
            </div>
            <p className="text-gray-600 mt-1">创建和管理您的英语文章</p>
          </motion.div>


          {/* 搜索栏和新建按钮 */}
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
                placeholder="搜索文章..."
                className="w-full pl-12 pr-12 py-3 rounded-2xl border border-gray-200 bg-white/80 backdrop-blur-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <button
                onClick={createNewArticle}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-blue-500 hover:bg-blue-600 text-white rounded-xl p-2 transition-colors shadow-md hover:shadow-lg"
                title="新建文章"
              >
                <Plus size={20} />
              </button>
            </div>
          </motion.div>

          {/* 文章列表 / 空状态 */}
          {articles.length > 0 ? (
            <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar pr-2">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-4"
              >
              {filteredArticles.map((article, index) => (
                <motion.div
                  key={article.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  onClick={() => openArticle(article)}
                  className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-lg p-6 cursor-pointer hover:shadow-xl transition-all duration-200 border border-white/20 relative group"
                >
                  {/* 删除按钮 */}
                  <button
                    onClick={(e) => deleteArticle(article.id, e)}
                    className="absolute top-4 right-4 text-gray-400 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>

                  <div className="flex items-start gap-4 mb-4">
                    <div className="bg-blue-100 p-3 rounded-xl">
                      <FileText className="text-blue-600" size={24} />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-semibold text-gray-800 mb-2 line-clamp-2">
                        {article.title || '无标题'}
                      </h3>
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <Calendar size={14} />
                        <span>{formatDate(article.updatedAt)}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-gray-600 text-sm line-clamp-3">
                    {article.content || '暂无内容'}
                  </div>

                  {article.suggestions && article.suggestions.length > 0 && (
                    <div className="mt-4 flex items-center gap-2">
                      <div className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded-full">
                        {article.suggestions.length} 条建议
                      </div>
                    </div>
                  )}
                </motion.div>
              ))}
              </motion.div>
            </div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex-1 min-h-0 flex items-center justify-center"
            >
              <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-lg p-12 text-center">
                <PenTool size={64} className="text-gray-300 mx-auto mb-4" />
                <h3 className="text-2xl font-semibold text-gray-600 mb-2">开始写作</h3>
                <p className="text-gray-500 mb-6">您还没有创建任何文章，点击上方按钮开始您的第一篇英语文章吧！</p>
                <button
                  onClick={createNewArticle}
                  className="bg-blue-500 hover:bg-blue-600 text-white rounded-xl px-6 py-3 font-medium transition-colors inline-flex items-center gap-2"
                >
                  <Plus size={20} />
                  创建第一篇文章
                </button>
              </div>
            </motion.div>
          )}
        </div>
      </div>
      
      {/* 删除确认对话框 */}
      {deleteDialogOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white/95 backdrop-blur-lg rounded-2xl shadow-xl max-w-md w-full border border-white/40 p-6">
            <h3 className="text-xl font-semibold text-gray-800 mb-4">确认删除</h3>
            <p className="text-gray-600 mb-6">确定要删除这篇文章吗？此操作无法撤销。</p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={cancelDelete}
                className="px-4 py-2 rounded-xl bg-gray-200 hover:bg-gray-300 text-gray-700 transition-colors"
              >
                取消
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 rounded-xl bg-red-500 hover:bg-red-600 text-white transition-colors"
              >
                删除
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Writing;
