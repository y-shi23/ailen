
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation, useNavigate } from 'react-router-dom';
import { PenTool, Volume2, User, MicOff, Star, Bot, Mic, Search, BookOpen, Send, List, Plus, Trash2 } from 'lucide-react';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import React, { useRef, useEffect, useState } from 'react';
const AIChat = () => {
  const [messages, setMessages] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [currentSessionId, setCurrentSessionId] = useState(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isAISpeaking, setIsAISpeaking] = useState(false);
  const [recognition, setRecognition] = useState(null);
  const [audioLevel, setAudioLevel] = useState(0);
  const messagesEndRef = useRef(null);
  const audioLevelRef = useRef(0);
  const speechTimeoutRef = useRef(null);
  const silenceDetectionRef = useRef(null);
  const lastSpeechTimeRef = useRef(0);
  const inputValueRef = useRef('');
  const isLoadingRef = useRef(false);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const microphoneRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const recordedChunksRef = useRef([]);
  const groqTranscribingRef = useRef(false);
  const isConversationModeRef = useRef(false);
  const consecutiveSilenceCountRef = useRef(0);
  const navigate = useNavigate();
  const location = useLocation();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // 会话存取工具
  const STORAGE_KEY = 'chatSessions';
  const greeting = () => ({
    id: Date.now(),
    text: "Hello! I'm your English learning assistant. What topics do you like to talk about? Feel free to share your interests, and we can have a natural conversation!",
    sender: 'ai',
    timestamp: new Date()
  });

  const loadSessions = () => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  };
  const saveSessions = (list) => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(list)); } catch {}
  };
  const toSerializableMessages = (msgs) => msgs.map(m => ({ ...m, timestamp: new Date(m.timestamp).toISOString() }));
  const toRuntimeMessages = (msgs) => msgs.map(m => ({ ...m, timestamp: new Date(m.timestamp) }));

  const createNewSession = () => {
    const id = `${Date.now()}`;
    const newSession = {
      id,
      title: '',
      messages: toSerializableMessages([greeting()]),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    const next = [newSession, ...sessions];
    setSessions(next);
    saveSessions(next);
    setCurrentSessionId(id);
    setMessages(toRuntimeMessages(newSession.messages));
  };

  const updateCurrentSession = (updater) => {
    setSessions(prev => {
      const idx = prev.findIndex(s => s.id === currentSessionId);
      if (idx === -1) return prev;
      const updated = typeof updater === 'function' ? updater(prev[idx]) : { ...prev[idx], ...updater };
      const list = [...prev];
      list[idx] = { ...updated, updatedAt: new Date().toISOString() };
      saveSessions(list);
      return list;
    });
  };

  const switchSession = (id) => {
    if (id === currentSessionId) return;
    // 清理对话相关状态
    stopSilenceDetection();
    setIsListening(false);
    setIsAISpeaking(false);
    if (speechTimeoutRef.current) { clearTimeout(speechTimeoutRef.current); speechTimeoutRef.current = null; }
    try { if (recognition) recognition.stop(); } catch {}
    try { if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') mediaRecorderRef.current.stop(); } catch {}

    const s = sessions.find(x => x.id === id);
    if (!s) return;
    setCurrentSessionId(id);
    setMessages(toRuntimeMessages(s.messages));
    setHistoryOpen(false);
  };

  const deleteSession = (id) => {
    setSessions(prev => {
      const list = prev.filter(s => s.id !== id);
      saveSessions(list);
      // 如果删的是当前会话，切到最新或新建
      if (id === currentSessionId) {
        if (list.length > 0) {
          const next = list[0];
          setCurrentSessionId(next.id);
          setMessages(toRuntimeMessages(next.messages));
        } else {
          createNewSession();
        }
      }
      return list;
    });
  };

  // 初始化载入会话
  useEffect(() => {
    const list = loadSessions();
    if (list.length === 0) {
      // 首次创建会话
      setSessions([]); // 先清空，再通过 createNewSession 推入
      createNewSession();
    } else {
      setSessions(list);
      setCurrentSessionId(list[0].id);
      setMessages(toRuntimeMessages(list[0].messages));
    }
  }, []);

  // 同步 refs，避免闭包读取到过期状态
  useEffect(() => {
    inputValueRef.current = inputValue;
  }, [inputValue]);
  useEffect(() => {
    isLoadingRef.current = isLoading;
  }, [isLoading]);

  // 组件卸载时清理资源
  useEffect(() => {
    return () => {
      stopSilenceDetection();
      if (speechTimeoutRef.current) {
        clearTimeout(speechTimeoutRef.current);
        speechTimeoutRef.current = null;
      }
      try {
        if (recognition) recognition.stop();
      } catch {}
      try {
        if (audioContextRef.current) audioContextRef.current.close();
      } catch {}
    };
  }, []);

  // 检测语音活动并自动发送
  const checkSpeechActivity = () => {
    if (inputValueRef.current.trim() && !isLoadingRef.current) {
      handleAutoSend();
    }
  };

  // 开始静音检测
  const startSilenceDetection = () => {
    // 清除之前的静音检测
    if (silenceDetectionRef.current) {
      clearInterval(silenceDetectionRef.current);
    }
    
    consecutiveSilenceCountRef.current = 0;
    
    // 每100ms检查一次静音状态
    silenceDetectionRef.current = setInterval(() => {
      const currentLevel = audioLevelRef.current;
      const isSpeaking = currentLevel > 20; // 提高阈值，避免环境噪音
      
      if (isSpeaking) {
        consecutiveSilenceCountRef.current = 0;
        lastSpeechTimeRef.current = Date.now();
      } else {
        consecutiveSilenceCountRef.current++;
        
        // 如果连续2秒静音且有文本内容，自动发送 (20 * 100ms = 2s)
        if (consecutiveSilenceCountRef.current >= 20 && inputValueRef.current.trim()) {
          checkSpeechActivity();
          consecutiveSilenceCountRef.current = 0;
        }
      }
    }, 100);
  };

  // 停止静音检测
  const stopSilenceDetection = () => {
    if (silenceDetectionRef.current) {
      clearInterval(silenceDetectionRef.current);
      silenceDetectionRef.current = null;
    }
    consecutiveSilenceCountRef.current = 0;
  };

  // 初始化语音识别
  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const rec = new SpeechRecognition();
      rec.continuous = true;
      rec.interimResults = true;
      rec.lang = 'en-US';

      rec.onresult = (event) => {
        let finalTranscript = '';
        
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript;
          }
        }

        if (finalTranscript) {
          setInputValue(prev => prev + finalTranscript + ' ');
          // 有新的语音识别结果时重置静音计数
          consecutiveSilenceCountRef.current = 0;
        }

        // 任意识别结果到来时，重置 2 秒防抖自动发送定时器
        if (speechTimeoutRef.current) {
          clearTimeout(speechTimeoutRef.current);
        }
        speechTimeoutRef.current = setTimeout(() => {
          if (inputValueRef.current.trim() && !isLoadingRef.current) {
            handleAutoSend();
          }
        }, 2000);
      };

      rec.onend = () => {
        if (isConversationModeRef.current) {
          setTimeout(() => {
            if (isConversationModeRef.current && !isAISpeaking) {
              try { rec.start(); } catch {}
            }
          }, 100);
        } else {
          setIsListening(false);
          setAudioLevel(0);
        }
      };

      rec.onerror = (event) => {
        console.error('Speech recognition error', event.error);
        
        if (event.error === 'no-speech' && isConversationModeRef.current) {
          // 对话模式下无语音错误时重新开始
          setTimeout(() => {
            if (isConversationModeRef.current && !isAISpeaking) {
              try {
                rec.start();
              } catch (error) {
                console.error('Failed to restart recognition:', error);
              }
            }
          }, 1000);
        } else if (event.error === 'aborted') {
          // 被中止是正常的，比如手动停止或AI语音播放时
          console.log('Speech recognition aborted - this is normal');
          // 不需要重置状态，让调用者处理
        } else if (event.error === 'not-allowed') {
          // 权限问题
          alert('请允许使用麦克风权限');
          setIsListening(false);
          isConversationModeRef.current = false;
          stopSilenceDetection();
        } else {
          // 其他错误
          console.error('Unexpected speech recognition error:', event.error);
          setIsListening(false);
          setAudioLevel(0);
          if (!isConversationModeRef.current) {
            stopSilenceDetection();
          }
        }
      };

      setRecognition(rec);
    }
  }, []);

  // 音频级别检测和语音中断检测
  useEffect(() => {
    let animationFrame;

    const updateAudioLevel = () => {
      if (analyserRef.current) {
        const bufferLength = analyserRef.current.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        analyserRef.current.getByteFrequencyData(dataArray);
        
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i];
        }
        const average = sum / bufferLength;
        const level = Math.min(100, Math.max(0, Math.floor(average)));
        setAudioLevel(level);
        audioLevelRef.current = level;

        // 如果AI正在说话且检测到用户语音，中断AI语音
        if (isAISpeaking && level > 15) {
          stopAISpeech();
        }
      }
      animationFrame = requestAnimationFrame(updateAudioLevel);
    };

    if (isListening) {
      updateAudioLevel();
    }

    return () => {
      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
      }
    };
  }, [isListening, isAISpeaking]);

  // 初始化音频上下文（用于音量可视化与打断）
  const initAudioContext = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      analyserRef.current = audioContextRef.current.createAnalyser();
      microphoneRef.current = audioContextRef.current.createMediaStreamSource(stream);
      microphoneRef.current.connect(analyserRef.current);
      analyserRef.current.fftSize = 256;

      // 初始化 MediaRecorder，用于 Groq STT 录音
      if (window.MediaRecorder) {
        mediaRecorderRef.current = new MediaRecorder(stream, {
          mimeType: 'audio/webm'
        });
        mediaRecorderRef.current.ondataavailable = (e) => {
          if (e.data && e.data.size > 0) {
            recordedChunksRef.current.push(e.data);
          }
        };
      }
    } catch (err) {
      console.error('Error accessing microphone for audio level detection:', err);
    }
  };

  // 播放文本语音
  const playTextToSpeech = (text) => {
    if ('speechSynthesis' in window) {
      // 如果已经在对话模式，先停止语音识别
      if (isConversationModeRef.current && recognition && isListening) {
        recognition.stop();
        stopSilenceDetection();
      }
      
      window.speechSynthesis.cancel(); // 取消之前的语音
      
      const speech = new SpeechSynthesisUtterance(text);
      speech.lang = 'en-US';
      speech.rate = 0.9;
      speech.pitch = 1;
      speech.volume = 1;
      
      speech.onstart = () => {
        setIsAISpeaking(true);
      };
      
      speech.onend = () => {
        setIsAISpeaking(false);
        // AI语音结束后，如果是对话模式，重新开始监听和静音检测
        if (isConversationModeRef.current) {
          setTimeout(() => {
            if (recognition && !isListening) {
              recognition.start();
              startSilenceDetection();
              setIsListening(true);
            }
          }, 500);
        }
      };
      
      speech.onerror = () => {
        setIsAISpeaking(false);
      };
      
      window.speechSynthesis.speak(speech);
    }
  };

  // 停止AI语音
  const stopAISpeech = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsAISpeaking(false);
    }
  };

  // Groq STT: 将当前录制的音频块上传转写
  const transcribeWithGroq = async () => {
    const sttApiKey = localStorage.getItem('sttApiKey');
    const sttModel = localStorage.getItem('sttModel');
    const sttApiUrlBase = (localStorage.getItem('sttApiUrl') || 'https://api.groq.com/openai').replace(/\/$/, '');

    if (!sttApiKey || !sttModel) return null;

    try {
      const blob = new Blob(recordedChunksRef.current, { type: 'audio/webm' });
      recordedChunksRef.current = [];

      const form = new FormData();
      form.append('file', blob, 'audio.webm');
      form.append('model', sttModel);
      form.append('language', 'en');
      form.append('temperature', '0');

      // dev 环境通过代理以避免 CORS；prod 直连
      const isDev = import.meta && import.meta.env && import.meta.env.DEV;
      const endpoint = `${sttApiUrlBase}/v1/audio/transcriptions`;
      const url = isDev ? `/proxy-groq${new URL(endpoint).pathname}` : endpoint;

      const res = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${sttApiKey}`
        },
        body: form
      });
      if (!res.ok) {
        const t = await res.text();
        throw new Error(`Groq STT failed: ${res.status} ${t}`);
      }
      const data = await res.json();
      // OpenAI 兼容返回：text 字段
      return data.text || '';
    } catch (e) {
      console.error(e);
      return null;
    }
  };

  // 自动发送消息
  const handleAutoSend = async () => {
    const text = inputValueRef.current.trim();
    if (!text || isLoadingRef.current) return;
    
    // 停止静音检测，防止重复发送
    stopSilenceDetection();
    
    await handleSend(text);
    
    // 发送完成后，如果仍在对话模式，重新启动静音检测
    if (isConversationModeRef.current) {
      setTimeout(() => {
        startSilenceDetection();
      }, 1000);
    }
  };

  const handleSend = async (overrideText) => {
    const textToSendRaw = overrideText ?? inputValue;
    const textToSend = (textToSendRaw || '').trim();
    if (!textToSend || isLoadingRef.current) return;

    // 清除所有超时
    if (speechTimeoutRef.current) {
      clearTimeout(speechTimeoutRef.current);
      speechTimeoutRef.current = null;
    }

    // 停止静音检测和语音识别
    stopSilenceDetection();
    if (recognition && isListening) {
      recognition.stop();
    }
    // 停止录音
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try { mediaRecorderRef.current.stop(); } catch {}
    }

    const userMessage = {
      id: Date.now(),
      text: textToSend,
      sender: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    // 更新到当前会话（加入用户消息）
    updateCurrentSession(session => ({
      ...session,
      messages: toSerializableMessages([...toRuntimeMessages(session.messages), userMessage])
    }));

    // 如果会话还没有标题，尝试自动归纳标题
    (async () => {
      try {
        const hasTitle = sessions.find(s => s.id === currentSessionId)?.title;
        if (!hasTitle) {
          const summary = await summarizeTitle(textToSend);
          if (summary) updateCurrentSession({ title: summary });
        }
      } catch {}
    })();

    try {
      // 获取API配置
      const apiKey = localStorage.getItem('apiKey');
      const apiUrl = localStorage.getItem('apiUrl');
      const selectedModel = localStorage.getItem('selectedModel');
      
      if (!apiKey || !apiUrl || !selectedModel) {
        throw new Error('请先在设置中配置API信息');
      }

      // AI提示词 - 英语学习导师
      const systemPrompt = `You are now a professional English language tutor focused on helping users improve their English speaking and listening skills through natural conversation. Please follow these principles when interacting with users:

1. **Role Positioning**: Be a friendly, patient native-level mentor who automatically judges the user's English level (beginner/intermediate/advanced) and matches the appropriate difficulty level of response.

2. **Conversation Logic**:
   - Guide the conversation with open-ended questions (avoid closed "Yes/No" questions)
   - Combine user interests (you can actively ask: "What topics do you like to talk about?")
   - Naturally continue the topic, simulating real communication scenarios (such as daily greetings, hobbies, travel, work, etc.)

3. **Educational Feedback** (core function):
   - Gently correct grammar errors: first affirm the correct part, then point out the error (e.g., "Your sentence is clear! Just a small note: we say 'I went to the park yesterday' instead of 'I go' here.")
   - When explaining error reasons, include simple rules (e.g., "We use past tense when talking about yesterday.")
   - For advanced users, you can suggest more idiomatic expressions (e.g., "Instead of 'very big', native speakers often say 'huge' in this context.")
   - When encountering new words, proactively ask if explanation is needed, and provide example sentences when explaining.

4. **Interaction Rhythm**:
   - Keep each response moderate in length (3-5 sentences) to avoid information overload
   - Add encouraging language at appropriate times in the conversation (e.g., "Your pronunciation is getting better! That sentence flows well.")
   - Allow users to switch topics or ask language-related questions at any time (e.g., "How to use 'present perfect'?")

5. **Special Scenario Support**:
   - If requested, you can simulate specific scenario dialogues (such as ordering in a restaurant, interviews, asking for directions while traveling)
   - You can adjust text prompts related to speech speed according to user needs (e.g., "Shall I use simpler words?" or "Want to try a more complex topic?")

Please respond in pure English unless the user explicitly requests Chinese explanation. Start with a friendly greeting and guide the user to start the conversation.`;

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
              content: systemPrompt
            },
            ...messages.map(msg => ({
              role: msg.sender === 'ai' ? 'assistant' : 'user',
              content: msg.text
            })),
            {
              role: "user",
              content: textToSend
            }
          ],
          temperature: 0.7,
          max_tokens: 500
        })
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`API request failed: ${response.status} ${response.statusText} - ${errorData}`);
      }

      const data = await response.json();
      const aiResponse = data.choices[0].message.content;

      const aiMessage = {
        id: Date.now() + 1,
        text: aiResponse,
        sender: 'ai',
        timestamp: new Date()
      };

      setMessages(prev => [...prev, aiMessage]);
      // 保存AI回复到会话
      updateCurrentSession(session => ({
        ...session,
        messages: toSerializableMessages([...toRuntimeMessages(session.messages), aiMessage])
      }));
      
      // 如果是对话模式，自动播放AI语音
      if (isConversationModeRef.current) {
        setTimeout(() => {
          playTextToSpeech(aiResponse);
        }, 500);
      }
    } catch (error) {
      console.error('AI Chat Error:', error);
      const errorMessage = {
        id: Date.now() + 1,
        text: "Sorry, I encountered an issue. Please check your API settings or try again later.",
        sender: 'ai',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  // 标题自动归纳
  const summarizeTitle = async (firstUserText) => {
    const apiKey = localStorage.getItem('apiKey');
    const apiUrl = localStorage.getItem('apiUrl');
    const selectedModel = localStorage.getItem('selectedModel');
    if (!apiKey || !apiUrl || !selectedModel) {
      // 无配置时简单截断用户首条
      return (firstUserText || '').slice(0, 30) || 'New Chat';
    }
    try {
      const baseUrl = apiUrl.replace(/\/$/, '');
      const resp = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: selectedModel,
          messages: [
            { role: 'system', content: 'You generate a concise chat title (<= 6 words), in English, Pascal Case, no punctuation.' },
            { role: 'user', content: `Create a short topic title for this conversation based on the following first user message:\n${firstUserText}` }
          ],
          temperature: 0.2,
          max_tokens: 16
        })
      });
      if (!resp.ok) throw new Error('title api failed');
      const data = await resp.json();
      const t = data.choices?.[0]?.message?.content?.trim();
      return t || (firstUserText || '').slice(0, 30) || 'New Chat';
    } catch (e) {
      console.warn('summarizeTitle failed, fallback to snippet');
      return (firstUserText || '').slice(0, 30) || 'New Chat';
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
  handleSend();
    }
  };

  const toggleListening = async () => {
    const sttApiKey = localStorage.getItem('sttApiKey');
    const sttModel = localStorage.getItem('sttModel');
    const hasGroq = !!(sttApiKey && sttModel);

    if (!hasGroq && !recognition) {
      alert('未检测到 STT 服务。请在设置中配置 Groq STT，或使用支持浏览器语音识别的浏览器（建议 Chrome）。');
      return;
    }

    try {
      if (isListening) {
        // 停止对话模式
        isConversationModeRef.current = false;
    // 关闭识别与录音
    try { if (recognition) recognition.stop(); } catch {}
    try { if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') mediaRecorderRef.current.stop(); } catch {}
        setIsListening(false);
        setAudioLevel(0);
        
        // 停止静音检测
        stopSilenceDetection();
        
        // 清除所有超时
        if (speechTimeoutRef.current) {
          clearTimeout(speechTimeoutRef.current);
          speechTimeoutRef.current = null;
        }
      } else {
        // 如果AI正在说话，先停止AI语音
        if (isAISpeaking) {
          stopAISpeech();
        }
        
        // 开始对话模式
        isConversationModeRef.current = true;
        setIsListening(true);
        
        // 初始化音频上下文
        if (!audioContextRef.current) {
          await initAudioContext();
        }
        
        // 清空输入框，准备新的对话
        setInputValue('');
        
        // 重置静音计数
        consecutiveSilenceCountRef.current = 0;
        
        // 开始静音检测
        startSilenceDetection();
        
        // 开始语音识别
        recognition.start();
      }
    } catch (error) {
      console.error('Error in toggleListening:', error);
      // 如果出错，重置状态
      setIsListening(false);
      isConversationModeRef.current = false;
      stopSilenceDetection();
      
      // 显示友好的错误提示
      if (error.name === 'NotAllowedError') {
        alert('请允许使用麦克风权限');
      } else if (error.error === 'aborted') {
        // 这是正常的中断，不需要特殊处理
        console.log('Speech recognition was aborted');
      } else {
        alert('语音识别启动失败，请重试');
      }
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
        <button
          onClick={() => navigate('/ai-chat')}
          className={`p-3 rounded-2xl transition-colors ${location.pathname === '/ai-chat' ? 'bg-blue-100 text-blue-600' : 'text-gray-500 hover:bg-gray-100'}`}
          title="AI对话"
        >
          <Bot size={24} />
        </button>
      </div>

      {/* 主内容区 */}
      <div className="flex-1 bg-gradient-to-br from-blue-50 to-indigo-100 p-4 overflow-hidden flex flex-col">
        <div className="flex-1 flex flex-col h-full w-[80%] mx-auto">
          {/* 标题区域 */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 mt-4"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bot className="text-blue-600" />
                <h1 className="text-3xl font-bold text-gray-800">AI 英语对话导师</h1>
              </div>
              {/* 历史会话按钮 */}
              <Popover open={historyOpen} onOpenChange={setHistoryOpen}>
                <PopoverTrigger asChild>
                  <button
                    className="rounded-xl h-10 w-10 bg-white/80 hover:bg-white text-gray-700 shadow-sm flex items-center justify-center"
                    title="对话历史"
                  >
                    <List size={18} />
                  </button>
                </PopoverTrigger>
                <PopoverContent align="end" className="w-80 p-0">
                  <div className="p-3 border-b flex items-center justify-between">
                    <div className="text-sm font-medium">会话历史</div>
                    <button
                      className="text-xs px-2 py-1 rounded bg-blue-500 text-white hover:bg-blue-600"
                      onClick={() => createNewSession()}
                    >
                      <div className="flex items-center gap-1"><Plus size={14} />新建</div>
                    </button>
                  </div>
                  <div className="max-h-80 overflow-auto divide-y">
                    {sessions.length === 0 ? (
                      <div className="p-4 text-sm text-gray-500">暂无会话</div>
                    ) : (
                      sessions.map(s => (
                        <div key={s.id} className={`flex items-center gap-2 p-3 hover:bg-gray-50 ${s.id === currentSessionId ? 'bg-blue-50' : ''}`}>
                          <button className="flex-1 text-left" onClick={() => switchSession(s.id)}>
                            <div className="text-sm font-medium truncate">{s.title || '未命名会话'}</div>
                            <div className="text-xs text-gray-500 mt-0.5 truncate">{new Date(s.updatedAt).toLocaleString()}</div>
                          </button>
                          <button className="text-gray-400 hover:text-red-500" onClick={() => deleteSession(s.id)} title="删除">
                            <Trash2 size={16} />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </PopoverContent>
              </Popover>
            </div>
            <p className="text-gray-600 mt-1">与AI导师进行自然英语对话，提升听说能力</p>
          </motion.div>

          {/* 聊天消息区域 */}
          <div className="flex-1 min-h-0 overflow-hidden mb-4">
            <div className="h-full bg-white/80 backdrop-blur-lg rounded-2xl shadow-lg p-6 overflow-y-auto custom-scrollbar">
              <div className="space-y-6">
                <AnimatePresence>
                  {messages.map((message) => (
                    <motion.div
                      key={message.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      transition={{ duration: 0.3 }}
                      className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`flex max-w-[80%] ${message.sender === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                        {/* 头像 */}
                        <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
                          message.sender === 'user' 
                            ? 'bg-blue-500 ml-3' 
                            : 'bg-purple-500 mr-3'
                        }`}>
                          {message.sender === 'user' ? (
                            <User size={20} className="text-white" />
                          ) : (
                            <Bot size={20} className="text-white" />
                          )}
                        </div>
                        
                        {/* 消息气泡 */}
                        <div className={`rounded-2xl px-4 py-3 relative ${
                          message.sender === 'user'
                            ? 'bg-blue-500 text-white rounded-tr-none'
                            : 'bg-gray-100 text-gray-800 rounded-tl-none'
                        }`}>
                          <p className="whitespace-pre-wrap">{message.text}</p>
                          <p className={`text-xs mt-1 ${
                            message.sender === 'user' ? 'text-blue-100' : 'text-gray-500'
                          }`}>
                            {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                          {/* AI消息添加语音播放按钮 */}
                          {message.sender === 'ai' && (
                            <button
                              onClick={() => playTextToSpeech(message.text)}
                              disabled={isAISpeaking}
                              className={`absolute -bottom-2 -right-2 rounded-full p-1.5 shadow-md transition-all hover:scale-110 ${
                                isAISpeaking 
                                  ? 'bg-red-500 text-white animate-pulse' 
                                  : 'bg-purple-500 text-white hover:bg-purple-600'
                              }`}
                              title={isAISpeaking ? "Stop speaking" : "Play voice"}
                            >
                              <Volume2 size={14} />
                            </button>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
                {isLoading && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex justify-start"
                  >
                    <div className="flex max-w-[80%]">
                      <div className="flex-shrink-0 w-10 h-10 rounded-full bg-purple-500 mr-3 flex items-center justify-center">
                        <Bot size={20} className="text-white" />
                      </div>
                      <div className="bg-gray-100 text-gray-800 rounded-2xl rounded-tl-none px-4 py-3">
                        <div className="flex space-x-2">
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
                <div ref={messagesEndRef} />
              </div>
            </div>
          </div>

          {/* 输入区域 */}
          <div className="flex-shrink-0 mb-6">
            <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-lg p-4">
              <div className="flex items-center gap-2">
                {/* 麦克风按钮 */}
                <button
                  onClick={toggleListening}
                  disabled={isLoading || isAISpeaking}
                  className={`flex-shrink-0 h-14 w-14 rounded-xl flex items-center justify-center transition-all shadow-md hover:shadow-lg ${
                    isListening 
                      ? 'bg-red-500 hover:bg-red-600 text-white animate-pulse shadow-red-200' 
                      : isAISpeaking
                      ? 'bg-purple-500 text-white cursor-not-allowed'
                      : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                  }`}
                  title={
                    isAISpeaking ? "AI正在说话..." :
                    isListening ? "停止语音对话" : "开始语音对话"
                  }
                >
                  {isAISpeaking ? (
                    <Volume2 size={20} className="animate-pulse" />
                  ) : isListening ? (
                    <MicOff size={20} />
                  ) : (
                    <Mic size={20} />
                  )}
                </button>

        <div className="flex-1 relative">
                  <textarea
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder={
                      isListening 
                        ? "🎤 Listening... Speak naturally, I'll auto-send when you pause" 
                        : isAISpeaking
                        ? "🔊 AI is speaking... Talk to interrupt"
                        : "💡 Type here or click microphone for voice conversation"
                    }
      className={`w-full h-14 box-border px-4 py-3 rounded-xl border-none resize-none focus:outline-none focus:ring-0 transition-all leading-5 shadow-md hover:shadow-lg ${
                      isListening 
        ? 'bg-blue-50 border-2 border-blue-200 focus:border-blue-400' 
                        : isAISpeaking
        ? 'bg-purple-50 border-2 border-purple-200 focus:border-purple-400'
        : 'bg-gray-100'
                    }`}
                    disabled={isLoading || isListening || isAISpeaking}
                  />
                  {/* 音频可视化效果 */}
                  {isListening && (
                    <div className="absolute -top-8 left-0 right-0 flex justify-center">
                      <div className="flex items-end h-6 gap-1">
                        {[...Array(15)].map((_, i) => (
                          <div
                            key={i}
                            className={`w-1 rounded-full transition-all duration-100 ${
                              audioLevel > 15 ? 'bg-red-400' : 'bg-blue-500'
                            }`}
                            style={{
                              height: `${Math.min(24, Math.max(4, audioLevel * (0.7 + 0.3 * Math.sin(i * 0.5 + Date.now() * 0.01))))}px`
                            }}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* 对话模式状态指示器 */}
                  {isListening && (
                    <div className="absolute -top-12 left-0 right-0 flex justify-center">
                      <div className="bg-green-500 text-white px-3 py-1 rounded-full text-xs font-medium flex items-center gap-2">
                        <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                        Conversation Mode Active
                      </div>
                    </div>
                  )}
                </div>
                <button
                  onClick={handleSend}
                  disabled={!inputValue.trim() || isLoading}
                  className={`flex-shrink-0 h-14 w-14 rounded-xl flex items-center justify-center transition-colors shadow-md hover:shadow-lg ${
                    !inputValue.trim() || isLoading 
                      ? 'bg-gray-300 text-gray-500' 
                      : 'bg-blue-500 hover:bg-blue-600 text-white'
                  }`}
                >
                  {isLoading ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <Send size={20} />
                  )}
                </button>
              </div>
              <p className={`text-xs mt-2 text-center transition-colors ${
                isListening 
                  ? 'text-green-600 font-medium' 
                  : isAISpeaking
                  ? 'text-purple-600 font-medium'
                  : 'text-gray-500'
              }`}>
                {isListening 
                  ? "🎤 Smart auto-send when you pause speaking • Just talk naturally" 
                  : isAISpeaking
                  ? "🔊 AI is speaking... Talk to interrupt"
                  : "💡 Click microphone for smart voice conversation"
                }
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIChat;
