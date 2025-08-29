
import { motion } from 'framer-motion';
import EditWordCard from './EditWordCard';
import { Volume2, Edit3 } from 'lucide-react';
import React, { useState } from 'react';
const WordDetail = ({ wordData, onWordDataUpdate }) => {
  const [isEditing, setIsEditing] = useState(false);
  
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
        <button
          onClick={() => setIsEditing(true)}
          className="absolute bottom-4 right-4 p-2 rounded-full hover:bg-gray-100 transition-colors group"
          title="编辑单词卡片"
        >
          <Edit3 className="text-gray-500 group-hover:text-blue-500 transition-colors" size={18} />
        </button>
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
