import axios from 'axios';

class TTSService {
  constructor() {
    // 优先从环境变量读取，然后从localStorage读取
    this.openAIApiUrl = localStorage.getItem('ttsApiUrl') || import.meta.env.VITE_OPENAI_API_URL || 'https://api.openai.com/v1';
    this.openAIApiKey = localStorage.getItem('ttsApiKey') || import.meta.env.VITE_OPENAI_API_KEY;
    this.ttsModel = localStorage.getItem('ttsModel') || import.meta.env.VITE_TTS_MODEL || 'tts-1';
    this.ttsVoice = localStorage.getItem('ttsVoice') || import.meta.env.VITE_TTS_VOICE || 'alloy';
    this.isOpenAIEnabled = false;
    this.audioContext = null;
    this.currentAudio = null;
    
    // 初始化时检测OpenAI TTS服务
    this.checkOpenAIAvailability();
  }

  async checkOpenAIAvailability() {
    if (!this.openAIApiKey) {
      console.log('OpenAI API key not found, falling back to browser speech API');
      this.isOpenAIEnabled = false;
      return false;
    }

    try {
      // 发送一个简单的请求来验证API是否可用
      const response = await axios.get(`${this.openAIApiUrl}/models`, {
        headers: {
          'Authorization': `Bearer ${this.openAIApiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 5000
      });
      
      this.isOpenAIEnabled = true;
      console.log('OpenAI TTS service is available');
      return true;
    } catch (error) {
      console.error('OpenAI TTS service not available:', error.message);
      this.isOpenAIEnabled = false;
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
    const voice = options.voice || this.ttsVoice;
    const model = options.model || this.ttsModel;
    const speed = options.speed || 1.0;

    try {
      const response = await axios.post(
        `${this.openAIApiUrl}/audio/speech`,
        {
          model: model,
          input: text,
          voice: voice,
          speed: speed,
          response_format: 'mp3'
        },
        {
          headers: {
            'Authorization': `Bearer ${this.openAIApiKey}`,
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

  // 更新配置
  updateConfig(config) {
    if (config.apiUrl) this.openAIApiUrl = config.apiUrl;
    if (config.apiKey) this.openAIApiKey = config.apiKey;
    if (config.model) this.ttsModel = config.model;
    if (config.voice) this.ttsVoice = config.voice;
    
    // 重新检查服务可用性
    if (config.apiKey || config.apiUrl) {
      this.checkOpenAIAvailability();
    }
  }
}

// 创建单例实例
const ttsService = new TTSService();

export default ttsService;