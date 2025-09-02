import axios from 'axios';

class TTSService {
  constructor() {
    // 内置TTS配置（从环境变量读取）
    this.builtInTTS = {
      apiUrl: import.meta.env.VITE_OPENAI_API_URL,
      apiKey: import.meta.env.VITE_OPENAI_API_KEY,
      model: import.meta.env.VITE_TTS_MODEL || 'tts-1',
      voice: import.meta.env.VITE_TTS_VOICE || 'alloy'
    };
    
    // 用户自定义TTS配置（从localStorage读取）
    this.userTTS = {
      apiUrl: localStorage.getItem('userTtsApiUrl'),
      apiKey: localStorage.getItem('userTtsApiKey'),
      model: localStorage.getItem('userTtsModel'),
      voice: localStorage.getItem('userTtsVoice')
    };
    
    // 当前使用的配置
    this.currentConfig = this.userTTS.apiKey ? this.userTTS : this.builtInTTS;
    
    this.isOpenAIEnabled = false;
    this.audioContext = null;
    this.currentAudio = null;
    
    // 初始化时检测OpenAI TTS服务
    this.checkOpenAIAvailability();
  }

  async checkOpenAIAvailability() {
    // 尝试使用用户配置，如果没有则使用内置配置
    const configToTest = this.userTTS.apiKey ? this.userTTS : this.builtInTTS;
    
    if (!configToTest.apiKey) {
      console.log('No OpenAI API key found, falling back to browser speech API');
      this.isOpenAIEnabled = false;
      this.currentConfig = null;
      return false;
    }

    try {
      // 发送一个简单的请求来验证API是否可用
      const response = await axios.get(`${configToTest.apiUrl}/models`, {
        headers: {
          'Authorization': `Bearer ${configToTest.apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 5000
      });
      
      this.isOpenAIEnabled = true;
      this.currentConfig = configToTest;
      console.log(`OpenAI TTS service is available using ${configToTest === this.userTTS ? 'user' : 'built-in'} configuration`);
      return true;
    } catch (error) {
      console.error('OpenAI TTS service not available:', error.message);
      
      // 如果用户配置失败，尝试内置配置
      if (configToTest === this.userTTS && this.builtInTTS.apiKey) {
        try {
          const response = await axios.get(`${this.builtInTTS.apiUrl}/models`, {
            headers: {
              'Authorization': `Bearer ${this.builtInTTS.apiKey}`,
              'Content-Type': 'application/json'
            },
            timeout: 5000
          });
          
          this.isOpenAIEnabled = true;
          this.currentConfig = this.builtInTTS;
          console.log('OpenAI TTS service is available using built-in configuration');
          return true;
        } catch (innerError) {
          console.error('Built-in OpenAI TTS service also not available:', innerError.message);
        }
      }
      
      this.isOpenAIEnabled = false;
      this.currentConfig = null;
      return false;
    }
  }

  async speak(text, options = {}) {
    if (!text) return;

    // 停止当前正在播放的音频
    this.stop();

    // 优先使用OpenAI TTS
    if (this.isOpenAIEnabled && options.preferOpenAI !== false) {
      try {
        await this.speakWithOpenAI(text, options);
        return;
      } catch (error) {
        console.error('OpenAI TTS failed, falling back to browser speech API:', error);
        // OpenAI失败，回退到浏览器API
      }
    }

    // 使用浏览器Speech API作为备选
    await this.speakWithBrowser(text, options);
  }

  async speakWithOpenAI(text, options = {}) {
    if (!this.currentConfig) {
      throw new Error('No TTS configuration available');
    }
    
    const voice = options.voice || this.currentConfig.voice;
    const model = options.model || this.currentConfig.model;
    const speed = options.speed || 1.0;

    try {
      const response = await axios.post(
        `${this.currentConfig.apiUrl}/audio/speech`,
        {
          model: model,
          input: text,
          voice: voice,
          speed: speed,
          response_format: 'mp3'
        },
        {
          headers: {
            'Authorization': `Bearer ${this.currentConfig.apiKey}`,
            'Content-Type': 'application/json'
          },
          responseType: 'arraybuffer'
        }
      );

      // 播放音频
      const audioBuffer = response.data;
      this.playAudioBuffer(audioBuffer);
    } catch (error) {
      console.error('OpenAI TTS error:', error);
      throw error;
    }
  }

  async speakWithBrowser(text, options = {}) {
    if (!('speechSynthesis' in window)) {
      console.error('Browser speech synthesis not supported');
      return;
    }

    return new Promise((resolve, reject) => {
      const utterance = new SpeechSynthesisUtterance(text);
      
      utterance.lang = options.lang || 'en-US';
      utterance.rate = options.rate || 0.9;
      utterance.pitch = options.pitch || 1;
      utterance.volume = options.volume || 1;

      utterance.onend = () => {
        resolve();
      };

      utterance.onerror = (event) => {
        reject(new Error(`Speech synthesis error: ${event.error}`));
      };

      window.speechSynthesis.speak(utterance);
      
      // 保存当前utterance以便可以停止
      this.currentUtterance = utterance;
    });
  }

  playAudioBuffer(audioBuffer) {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }

    this.audioContext.decodeAudioData(audioBuffer, (buffer) => {
      const source = this.audioContext.createBufferSource();
      source.buffer = buffer;
      source.connect(this.audioContext.destination);
      
      this.currentAudio = source;
      
      source.onended = () => {
        this.currentAudio = null;
      };
      
      source.start(0);
    });
  }

  stop() {
    // 停止OpenAI音频
    if (this.currentAudio) {
      try {
        this.currentAudio.stop();
        this.currentAudio = null;
      } catch (e) {
        console.error('Error stopping OpenAI audio:', e);
      }
    }

    // 停止浏览器语音
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }

    // 停止当前utterance
    if (this.currentUtterance) {
      this.currentUtterance = null;
    }
  }

  isSpeaking() {
    if (this.currentAudio) {
      return true;
    }
    
    if ('speechSynthesis' in window) {
      return window.speechSynthesis.speaking;
    }
    
    return false;
  }

  getAvailableVoices() {
    if (!('speechSynthesis' in window)) {
      return [];
    }

    return window.speechSynthesis.getVoices().filter(voice => 
      voice.lang.startsWith('en')
    );
  }

  // 更新用户配置
  updateUserConfig(config) {
    if (config.apiUrl) {
      this.userTTS.apiUrl = config.apiUrl;
      localStorage.setItem('userTtsApiUrl', config.apiUrl);
    }
    if (config.apiKey) {
      this.userTTS.apiKey = config.apiKey;
      localStorage.setItem('userTtsApiKey', config.apiKey);
    }
    if (config.model) {
      this.userTTS.model = config.model;
      localStorage.setItem('userTtsModel', config.model);
    }
    if (config.voice) {
      this.userTTS.voice = config.voice;
      localStorage.setItem('userTtsVoice', config.voice);
    }
    
    // 重新检查服务可用性
    this.checkOpenAIAvailability();
  }
  
  // 清除用户配置
  clearUserConfig() {
    this.userTTS = {
      apiUrl: null,
      apiKey: null,
      model: null,
      voice: null
    };
    localStorage.removeItem('userTtsApiUrl');
    localStorage.removeItem('userTtsApiKey');
    localStorage.removeItem('userTtsModel');
    localStorage.removeItem('userTtsVoice');
    
    // 重新检查服务可用性（会回退到内置配置）
    this.checkOpenAIAvailability();
  }
  
  // 获取当前配置信息（用于UI显示）
  getConfigInfo() {
    if (!this.currentConfig) {
      return { source: 'browser', isUsingBuiltIn: false };
    }
    
    return {
      source: this.currentConfig === this.builtInTTS ? 'built-in' : 'user',
      isUsingBuiltIn: this.currentConfig === this.builtInTTS
    };
  }
}

// 创建单例实例
const ttsService = new TTSService();

export default ttsService;