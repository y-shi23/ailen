
import { motion } from 'framer-motion';
import { useNavigate, useParams } from 'react-router-dom';
import { Panel, PanelResizeHandle, PanelGroup } from 'react-resizable-panels';
import { toast } from 'sonner';
import { PenTool, Star, Loader2, Search, ArrowLeft, Sparkles, BookOpen, Check, X, Save } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
const ArticleEditor = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [article, setArticle] = useState(null);
  const [content, setContent] = useState('');
  const [title, setTitle] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [highlightedRanges, setHighlightedRanges] = useState([]);
  const [activeHighlightId, setActiveHighlightId] = useState(null);
  const [isEditorFocused, setIsEditorFocused] = useState(false);
  const [panelSizes, setPanelSizes] = useState([60, 40]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const textareaRef = useRef(null);

  useEffect(() => {
    loadArticle();
    loadPanelSizes();
  }, [id]);

  // 同步高亮：当建议或内容变化时，重新计算波浪线区段
  useEffect(() => {
    if (suggestions && suggestions.length > 0) {
      generateHighlights(suggestions);
    } else {
      setHighlightedRanges([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [suggestions, content]);

  const loadArticle = () => {
    const savedArticles = JSON.parse(localStorage.getItem('articles') || '[]');
    const foundArticle = savedArticles.find(article => article.id === id);
    
    if (foundArticle) {
      setArticle(foundArticle);
      setContent(foundArticle.content || '');
      setTitle(foundArticle.title || '');
      setSuggestions(foundArticle.suggestions || []);
    } else {
      toast.error('文章不存在');
      navigate('/writing');
    }
  };

  const loadPanelSizes = () => {
    const savedSizes = localStorage.getItem('articleEditorPanelSizes');
    if (savedSizes) {
      try {
        const parsedSizes = JSON.parse(savedSizes);
        if (Array.isArray(parsedSizes) && parsedSizes.length === 2) {
          setPanelSizes(parsedSizes);
        }
      } catch (error) {
        console.error('Error loading panel sizes:', error);
      }
    }
  };

  const savePanelSizes = (sizes) => {
    try {
      localStorage.setItem('articleEditorPanelSizes', JSON.stringify(sizes));
    } catch (error) {
      console.error('Error saving panel sizes:', error);
    }
  };

  const saveArticle = () => {
    if (!article) return;
    
    const savedArticles = JSON.parse(localStorage.getItem('articles') || '[]');
    const updatedArticles = savedArticles.map(a => 
      a.id === id 
        ? { 
            ...a, 
            content, 
            title,
            suggestions,
            updatedAt: new Date().toISOString() 
          }
        : a
    );
    
    localStorage.setItem('articles', JSON.stringify(updatedArticles));
    toast.success('文章已保存');
  };

  const analyzeText = async () => {
    if (!content.trim()) {
      toast.error('请先输入一些文本');
      return;
    }

    setIsAnalyzing(true);
    
    try {
      // 获取API配置
      const apiKey = localStorage.getItem('apiKey');
      const apiUrl = localStorage.getItem('apiUrl');
      const selectedModel = localStorage.getItem('selectedModel');
      
      if (!apiKey || !apiUrl || !selectedModel) {
        toast.error('请先在设置中配置API信息');
        setIsAnalyzing(false);
        return;
      }

      // AI提示词 - 从AIprompt.md文件内容复制
      const aiPromptText = `# 英语文章润色与错误分析处理指令

## 角色定位

你是 "英语文本规范化处理助手"，需接收用户提供的任意英语文章文本（不限主题、长度），完成错误检测、精准润色，并以**结构化、机器可解析**的格式返回结果，供应用程序后续提取数据（如错误类型统计、润色前后对比等）。

## 核心处理任务

1.  **错误全面检测**：逐句识别文本中的 3 类问题，需标注完整信息（不可遗漏）：

*   拼写错误（如 "beautifull"→"beautiful"）

*   语法错误（含时态不一致、主谓不一致、名词单复数错误、介词误用、动词形式错误等）

*   不地道表达（不符合英语母语习惯的句式、词汇搭配，如 "I decide to go"→"I decided to go"）

1.  **精准润色**：修正所有错误，保持原文语义、情感、叙事逻辑不变，润色后文本需符合英语母语表达习惯。

2.  **结构化分析**：对所有检测出的错误进行分类统计，明确错误位置、错误类型、错误原因及修改依据。

## 输出格式要求（严格遵守，不可增减模块 / 格式）

### 1. 【输入文本记录】

*   格式：直接完整复制用户提供的原始英语文章，无需修改，段落分隔与原文一致。

### 2. 【润色后标准文本】

*   格式：呈现修正后的完整英语文章，段落结构与原文对应；所有错误已修正，语言符合英语母语规范，语义与原文完全一致。

### 3. 【错误分析详情表】（必为 Markdown 表格，列名不可修改）

| 序号  | 错误位置（段落 - 句子） | 错误类型    | 原始错误内容         | 修正后内容           | 错误原因说明（简洁）                     |
| --- | ------------- | ------- | -------------- | --------------- | ------------------------------ |
| 1   | 第 1 段第 1 句    | 时态不一致   | I decide to go | I decided to go | 描述 "last weekend" 过去事件，需用一般过去时 |
| 2   | 第 1 段第 1 句    | 名词单复数错误 | two friend     | two friends     | "friend" 前有数量词 "two"，需用复数形式    |
| ... | ...           | ...     | ...            | ...             | ...                            |

### 4. 【错误分类统计】（必为 Markdown 列表，分类不可合并）

*   拼写错误：共 X 处（可补充典型示例：如 "resturant"→"restaurant"）

*   语法错误：共 X 处（按子类型细分：时态错误 X 处、主谓不一致 X 处、名词单复数错误 X 处...）

*   不地道表达：共 X 处（可补充典型示例：如 "future plan"→"future plans"）

### 5. 【处理说明】（可选，仅当文本无错误时填写）

*   若原始文本无任何错误，需明确标注："经检测，用户提供的英语文章无拼写错误、语法错误及不地道表达，无需润色，原文符合英语母语规范。"

## 约束条件

1.  所有模块需用 "### 序号. 【模块名称】" 作为标题，模块顺序不可调整；

2.  "错误分析详情表" 中 "错误位置" 需精准到 "第 X 段第 X 句"（如原文无明确段落分隔，按自然语义段落划分）；

3.  语言需客观、简洁，避免冗余描述，所有信息以 "机器可提取" 为核心（如表格列数据无歧义、分类标签统一）；

4.  若用户输入文本为空或非英语文本，需返回固定提示："请提供有效英语文章文本，以便进行润色与错误分析。"`;

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
              content: aiPromptText
            },
            {
              role: "user",
              content: content
            }
          ],
          temperature: 0.3,
          max_tokens: 2000
        })
      });

      if (!response.ok) {
        throw new Error(`API请求失败: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const aiResponse = data.choices[0].message.content;
      
      // 解析AI响应，生成建议
      const parsedSuggestions = parseAIResponse(aiResponse);
      setSuggestions(parsedSuggestions);
      
      // 生成高亮范围
      generateHighlights(parsedSuggestions);
      
      toast.success('分析完成');
    } catch (error) {
      console.error('AI分析错误:', error);
      toast.error('分析失败: ' + (error.message || '未知错误'));
    } finally {
      setIsAnalyzing(false);
    }
  };

  const parseAIResponse = (aiResponse) => {
    const suggestions = [];
    const lines = aiResponse.split('\n');
    
    // 查找错误分析详情表
    let inTable = false;
    let tableStart = false;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // 找到表格开始
      if (line.includes('错误分析详情表')) {
        // 继续查找表格实际开始
        continue;
      }
      
      // 检查是否是表格行（包含 | 的行）
      if (line.includes('|') && !line.includes('---')) {
        // 跳过表头行
        if (line.includes('错误位置') || line.includes('序号')) {
          continue;
        }
        
        const columns = line.split('|').map(col => col.trim()).filter(col => col);
        
        // 确保有足够的列
        if (columns.length >= 5) {
          const [, position, type, original, suggested, reason] = columns;
          
          // 清理数据
          const cleanOriginal = original.replace(/^[\*\s]+|[\*\s]+$/g, '');
          const cleanSuggested = suggested.replace(/^[\*\s]+|[\*\s]+$/g, '');
          const cleanReason = reason.replace(/^[\*\s]+|[\*\s]+$/g, '');
          
          if (cleanOriginal && cleanSuggested) {
            suggestions.push({
              id: Date.now() + Math.random(),
              type: type || '语法错误',
              original: cleanOriginal,
              suggested: cleanSuggested,
              reason: cleanReason || '',
              status: 'pending'
            });
          }
        }
      }
    }
    
    return suggestions;
  };

  const generateHighlights = (suggestions) => {
    const highlights = [];
    
    suggestions.forEach((suggestion) => {
      if (suggestion.original && suggestion.status === 'pending') {
        // 查找所有匹配位置
        let index = content.indexOf(suggestion.original);
        while (index !== -1) {
          highlights.push({
            id: `${suggestion.id}-${index}`,
            start: index,
            end: index + suggestion.original.length,
            type: suggestion.type,
            color: getColorForType(suggestion.type),
            suggestionId: suggestion.id,
            original: suggestion.original
          });
          index = content.indexOf(suggestion.original, index + 1);
        }
      }
    });
    
        setHighlightedRanges(highlights);
  };

  const getColorForType = (type) => {
    const colors = {
      '拼写错误': 'bg-red-200',
      '语法错误': 'bg-yellow-200',
      '不地道表达': 'bg-blue-200',
      '时态不一致': 'bg-orange-200',
      '主谓不一致': 'bg-purple-200',
      '名词单复数错误': 'bg-pink-200'
    };
    return colors[type] || 'bg-gray-200';
  };

  const getWavyClassForType = (type) => {
    const wavyClasses = {
      '拼写错误': 'wavy-underline-red',
      '语法错误': 'wavy-underline-yellow',
      '不地道表达': 'wavy-underline-blue',
      '时态不一致': 'wavy-underline-orange',
      '主谓不一致': 'wavy-underline-purple',
      '名词单复数错误': 'wavy-underline-pink'
    };
    return wavyClasses[type] || 'wavy-underline-blue';
  };

  const getWavyColorForType = (type) => {
    const wavyColors = {
      '拼写错误': '#ef4444',
      '语法错误': '#eab308',
      '不地道表达': '#3b82f6',
      '时态不一致': '#f97316',
      '主谓不一致': '#a855f7',
      '名词单复数错误': '#ec4899'
    };
    return wavyColors[type] || '#3b82f6';
  };

  const handleHighlightClick = (suggestionId) => {
    setActiveHighlightId(suggestionId);
    
    // 找到对应的建议并滚动到视图中
    const suggestionElement = document.querySelector(`[data-suggestion-id="${suggestionId}"]`);
    if (suggestionElement) {
      suggestionElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      suggestionElement.classList.add('ring-2', 'ring-blue-500');
      setTimeout(() => {
        suggestionElement.classList.remove('ring-2', 'ring-blue-500');
      }, 2000);
    }
  };

  const handleSuggestionClick = (suggestionId) => {
    setActiveHighlightId(suggestionId);
    
    // 滚动左侧编辑器到对应文本位置（同步 overlay 与 textarea）
    const highlightElements = document.querySelectorAll(`[data-highlight-id="${suggestionId}"]`);
    if (highlightElements.length > 0) {
      const el = highlightElements[0];
      const overlay = el.closest('.editor-overlay');
      const textarea = document.querySelector('.editor-textarea');
      if (overlay && textarea) {
        const targetTop = Math.max(el.offsetTop - 60, 0);
        textarea.scrollTo({ top: targetTop, behavior: 'smooth' });
        // 同步 overlay 的滚动
        overlay.scrollTop = targetTop;
      }
    }
  };

  const applySuggestion = (suggestionId) => {
    const suggestion = suggestions.find(s => s.id === suggestionId);
    if (!suggestion || !suggestion.original || !suggestion.suggested) return;
    
    // 替换文本
    const newContent = content.replace(new RegExp(suggestion.original.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), suggestion.suggested);
    setContent(newContent);
    
    // 更新建议状态
    const updatedSuggestions = suggestions.map(s => 
      s.id === suggestionId ? { ...s, status: 'accepted' } : s
    );
    setSuggestions(updatedSuggestions);
    
    // 重新生成高亮
    generateHighlights(updatedSuggestions);
    
    // 保存文章
    setTimeout(saveArticle, 500);
    
    toast.success('建议已应用："' + suggestion.original + '" → "' + suggestion.suggested + '"');
  };

  const rejectSuggestion = (suggestionId) => {
    const updatedSuggestions = suggestions.map(s => 
      s.id === suggestionId ? { ...s, status: 'rejected' } : s
    );
    setSuggestions(updatedSuggestions);
    
    // 移除高亮
    setHighlightedRanges(prev => prev.filter(h => h.suggestionId !== suggestionId));
    
    // 保存文章
    setTimeout(saveArticle, 500);
    
    toast.success('建议已忽略');
  };

  const HighlightedEditor = ({ value, onChange, highlights, activeHighlightId, onHighlightClick, getWavyClassForType, isEditorFocused, setIsEditorFocused }) => {
    const textareaRef = useRef(null);
    const overlayRef = useRef(null);

    const handleChange = (e) => {
      onChange(e.target.value);
    };

    const handleScroll = () => {
      if (textareaRef.current && overlayRef.current) {
        overlayRef.current.scrollTop = textareaRef.current.scrollTop;
        overlayRef.current.scrollLeft = textareaRef.current.scrollLeft;
      }
    };

    const handleFocus = () => {
      setIsEditorFocused(true);
    };

    const handleBlur = () => {
      setIsEditorFocused(false);
    };

    // 构建镜像文本层内容：为所有建议原文添加波浪线，选中时增加背景高亮
    const buildOverlayContent = () => {
      if (!value) return [<span key="empty" style={{ color: 'transparent' }}>{' '}</span>];

      // 按开始位置排序，并简单跳过重叠区域，保证渲染稳定
      const sorted = [...highlights]
        .sort((a, b) => a.start - b.start)
        .filter(h => h.start >= 0 && h.end > h.start && h.end <= value.length);

      const nodes = [];
      let cursor = 0;

      const pushPlain = (text, key) => {
        if (!text) return;
        nodes.push(
          <span key={key} style={{ color: 'transparent' }}>{text}</span>
        );
      };

      sorted.forEach((h, idx) => {
        if (h.start < cursor) {
          // 与上一个高亮重叠，跳过以避免嵌套复杂度
          return;
        }
        pushPlain(value.slice(cursor, h.start), `plain-${idx}-${cursor}`);

        const isActive = activeHighlightId === h.suggestionId;
        const wavyClass = `${getWavyClassForType(h.type)} wavy-underline`;

        nodes.push(
          <span
            key={`hl-${h.id}`}
            className={wavyClass}
            title={`${h.type}: ${h.original}`}
            data-highlight-id={h.suggestionId}
            // pointer-events 设为 none，避免阻塞 textarea 操作；点击高亮可选
            style={{
              // 仅显示装饰线，不显示文本本身
              color: 'transparent',
              // 选中时提供背景增强可视性
              backgroundColor: isActive ? 'rgba(59,130,246,0.35)' : 'transparent',
              boxShadow: isActive ? '0 0 0 2px rgba(59,130,246,0.5)' : 'none',
              pointerEvents: 'auto',
            }}
            onClick={(e) => {
              // 默认 pointer-events:none 不会触发，这里保留逻辑以备将来开启
              if (onHighlightClick) onHighlightClick(h.suggestionId);
              e.stopPropagation();
            }}
          >
            {value.slice(h.start, h.end)}
          </span>
        );

        cursor = h.end;
      });

      pushPlain(value.slice(cursor), `plain-tail-${cursor}`);
      return nodes;
    };

    return (
      <div className={`relative bg-white rounded-xl border-2 transition-all duration-200 h-full overflow-hidden ${
        isEditorFocused 
          ? 'border-blue-500 shadow-[0_0_0_4px_rgba(59,130,246,0.2)]' 
          : 'border-gray-200'
      }`}>
        {/* 镜像文本层：与 textarea 同字形/排版，渲染波浪线与高亮 */}
        <div
          ref={overlayRef}
          className="editor-overlay absolute inset-0 overflow-auto p-6 whitespace-pre-wrap leading-relaxed text-base custom-scrollbar"
          style={{ pointerEvents: 'none' }}
        >
          {buildOverlayContent()}
        </div>

        <textarea
          ref={textareaRef}
          value={value}
          onChange={handleChange}
          onScroll={handleScroll}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder="开始写作您的英语文章..."
          className="editor-textarea w-full h-full p-6 border-none resize-none focus:outline-none bg-transparent relative z-10 rounded-xl text-base leading-relaxed overflow-y-auto overflow-x-hidden custom-scrollbar"
        />
      </div>
    );
  };

  const backToWriting = () => {
    saveArticle();
    navigate('/writing');
  };

  if (!article) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="h-screen flex overflow-hidden">
      {/* 修复：使用完整的侧边栏导航组件 */}
      <div className="w-20 bg-white/80 backdrop-blur-lg shadow-lg flex flex-col items-center py-6 space-y-8 flex-shrink-0">
        <button
          onClick={() => navigate('/')}
          className={`p-3 rounded-2xl transition-colors text-gray-500 hover:bg-gray-100`}
          title="搜索"
        >
          <Search size={24} />
        </button>
        <button
          onClick={() => navigate('/favorites')}
          className={`p-3 rounded-2xl transition-colors text-gray-500 hover:bg-gray-100`}
          title="收藏本"
        >
          <Star size={24} />
        </button>
        <button
          onClick={() => navigate('/writing')}
          className={`p-3 rounded-2xl transition-colors bg-blue-100 text-blue-600`}
          title="写作"
        >
          <PenTool size={24} />
        </button>
        {/* 修复：添加缺失的闪卡导航按钮 */}
        <button
          onClick={() => navigate('/flashcards')}
          className={`p-3 rounded-2xl transition-colors text-gray-500 hover:bg-gray-100`}
          title="闪卡"
        >
          <BookOpen size={24} />
        </button>
      </div>

      {/* 主内容区 */}
      <div className="flex-1 bg-gradient-to-br from-blue-50 to-indigo-100 p-4 overflow-hidden flex flex-col">
        <div className="flex flex-col h-full w-[80%] mx-auto">
          {/* 顶部工具栏 */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-lg p-4 mb-4 flex items-center justify-between flex-shrink-0"
          >
            <div className="flex items-center gap-4">
              <button
                onClick={backToWriting}
                className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors flex items-center gap-2"
              >
                <ArrowLeft size={20} />
                返回
              </button>
              
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="文章标题..."
                className="text-xl font-semibold bg-transparent border-none outline-none placeholder-gray-400"
              />
            </div>
            
            <div className="flex items-center gap-2">
              <button
                onClick={analyzeText}
                disabled={isAnalyzing}
                className="p-2 rounded-lg bg-blue-500 hover:bg-blue-600 text-white transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                {isAnalyzing ? (
                  <Loader2 size={20} className="animate-spin" />
                ) : (
                  <Sparkles size={20} />
                )}
                AI分析
              </button>
              
              <button
                onClick={saveArticle}
                className="p-2 rounded-lg bg-green-500 hover:bg-green-600 text-white transition-colors flex items-center gap-2"
              >
                <Save size={20} />
                保存
              </button>
            </div>
          </motion.div>

          {/* 编辑区域 */}
          <div className="flex-1 min-h-0">
            <PanelGroup direction="horizontal" onLayout={savePanelSizes}>
              <Panel defaultSize={panelSizes[0]} minSize={30}>
                <div className="h-full bg-white/80 backdrop-blur-lg rounded-2xl shadow-lg p-6 mr-2 flex flex-col">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2 flex-shrink-0">
                    <PenTool size={20} />
                    文章编辑
                  </h3>
                  
                  <div className="flex-1 min-h-0 overflow-hidden">
                    <HighlightedEditor 
                      value={content}
                      onChange={setContent}
                      highlights={highlightedRanges}
                      activeHighlightId={activeHighlightId}
                      onHighlightClick={handleHighlightClick}
                      getWavyClassForType={getWavyClassForType}
                      isEditorFocused={isEditorFocused}
                      setIsEditorFocused={setIsEditorFocused}
                    />
                  </div>
                </div>
              </Panel>
              
              <PanelResizeHandle className="w-2 bg-gray-300 hover:bg-gray-400 transition-colors rounded-lg flex-shrink-0" />
              
              <Panel defaultSize={panelSizes[1]} minSize={30}>
                <div className="h-full bg-white/80 backdrop-blur-lg rounded-2xl shadow-lg p-6 ml-2 flex flex-col">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2 flex-shrink-0">
                    <Sparkles size={20} />
                    AI建议 ({suggestions.length})
                  </h3>
                  
                  <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden space-y-3 custom-scrollbar pr-2">
                    {suggestions.length === 0 ? (
                      <div className="text-center text-gray-500 mt-8">
                        <Sparkles size={48} className="text-gray-300 mx-auto mb-4" />
                        <p>点击"AI分析"获取写作建议</p>
                      </div>
                    ) : (
                      suggestions.map((suggestion) => (
                        <div
                          key={suggestion.id}
                          data-suggestion-id={suggestion.id}
                          onClick={() => handleSuggestionClick(suggestion.id)}
                          className={`p-4 rounded-xl border-l-4 transition-all duration-200 shadow-sm hover:shadow-md cursor-pointer ${
                            suggestion.status === 'accepted' ? 'border-green-500 bg-green-50 shadow-green-100' :
                            suggestion.status === 'rejected' ? 'border-gray-300 bg-gray-50 opacity-50' :
                            activeHighlightId === suggestion.id ? 'border-blue-500 bg-blue-100 ring-2 ring-blue-300' :
                            'border-blue-500 bg-blue-50 hover:bg-blue-100'
                          }`}
                        >
                          <div className="flex items-start justify-between mb-2">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              suggestion.type === '拼写错误' ? 'bg-red-100 text-red-800' :
                              suggestion.type === '语法错误' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-blue-100 text-blue-800'
                            }`}>
                              {suggestion.type}
                            </span>
                            
                            {suggestion.status === 'pending' && (
                              <div className="flex gap-2">
                                <button
                                  onClick={() => applySuggestion(suggestion.id)}
                                  className="p-1.5 rounded-lg bg-green-500 hover:bg-green-600 text-white transition-all duration-200 hover:scale-105 shadow-sm hover:shadow-md"
                                  title="接受建议"
                                >
                                  <Check size={16} />
                                </button>
                                <button
                                  onClick={() => rejectSuggestion(suggestion.id)}
                                  className="p-1.5 rounded-lg bg-red-500 hover:bg-red-600 text-white transition-all duration-200 hover:scale-105 shadow-sm hover:shadow-md"
                                  title="拒绝建议"
                                >
                                  <X size={16} />
                                </button>
                              </div>
                            )}
                          </div>
                          
                          <div className="space-y-3 text-sm">
                            <div className="flex items-start gap-2">
                              <span className="font-medium text-red-600 min-w-0 flex-shrink-0">原文:</span>
                              <span className="text-gray-700 bg-red-50 px-2 py-1 rounded text-red-800 break-words">{suggestion.original}</span>
                            </div>
                            <div className="flex items-start gap-2">
                              <span className="font-medium text-green-600 min-w-0 flex-shrink-0">建议:</span>
                              <span className="text-gray-700 bg-green-50 px-2 py-1 rounded text-green-800 break-words">{suggestion.suggested}</span>
                            </div>
                            <div className="flex items-start gap-2">
                              <span className="font-medium text-gray-600 min-w-0 flex-shrink-0">原因:</span>
                              <span className="text-gray-600 bg-gray-50 px-2 py-1 rounded break-words">{suggestion.reason}</span>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </Panel>
            </PanelGroup>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ArticleEditor;
