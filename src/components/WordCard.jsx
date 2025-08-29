import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Star } from 'lucide-react';

const WordCard = ({ wordData }) => {
  const [isFavorite, setIsFavorite] = useState(false);

  useEffect(() => {
    const favorites = JSON.parse(localStorage.getItem('favorites') || '{}');
    setIsFavorite(!!favorites[wordData.word]);
  }, [wordData.word]);

  const toggleFavorite = () => {
    const favorites = JSON.parse(localStorage.getItem('favorites') || '{}');
    const newFavorites = { ...favorites };
    
    if (isFavorite) {
      delete newFavorites[wordData.word];
    } else {
      newFavorites[wordData.word] = wordData;
    }
    
    localStorage.setItem('favorites', JSON.stringify(newFavorites));
    setIsFavorite(!isFavorite);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-lg p-6 max-w-md w-full border border-white/20"
    >
      <div className="flex justify-between items-start mb-4">
        <h2 className="text-3xl font-bold text-gray-800">{wordData.word}</h2>
        <button 
          onClick={toggleFavorite}
          className="text-yellow-400 hover:text-yellow-500 transition-colors"
        >
          <Star 
            fill={isFavorite ? "currentColor" : "none"} 
            size={24} 
          />
        </button>
      </div>
      
      <div className="mb-4">
        <p className="text-gray-600 italic">{wordData.phonetic}</p>
      </div>
      
      <div className="space-y-4">
        {wordData.meanings.map((meaning, index) => (
          <div key={index} className="border-b border-gray-100 pb-4 last:border-0 last:pb-0">
            <h3 className="font-semibold text-gray-700 mb-2">{meaning.partOfSpeech}</h3>
            <p className="text-gray-600 mb-2">{meaning.definition}</p>
            {meaning.example && (
              <p className="text-gray-500 italic">例句: {meaning.example}</p>
            )}
          </div>
        ))}
      </div>
    </motion.div>
  );
};

export default WordCard;
