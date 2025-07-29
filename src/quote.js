// quotes.js - Health, Fitness, and Wellness Quotes Collection

export const healthQuotes = [
  // Fitness Quotes
  {
    text: "The groundwork for all happiness is good health.",
    author: "Leigh Hunt",
    category: "fitness"
  },

  {
    text: "Fuel your body like your dreams depend on it—because they do.",
    author: "Ritika Mishra",
    category: "fitness"
  },


  {
    text: "Take care of your body. It's the only place you have to live.",
    author: "Jim Rohn",
    category: "fitness"
  },

  {
    text: "Health is the silent partner of every success.",
    author: "Ritika Mishra",
    category: "fitness"
  },


  {
    text: "Peace comes from within. Do not seek it without.",
    author: "Buddha",
    category: "meditation"
  },

  {
    text: "Exercise is 10% effort and 90% convincing yourself to start.",
    author: "Ritika Mishra",
    category: "fitness"
  },
  {
    text: "Mindfulness is about being fully awake in our lives.",
    author: "Jon Kabat-Zinn",
    category: "meditation"
  },

  {
    text: "The hardest weight to lift is your own excuse.",
    author: "Ritika Mishra",
    category: "fitness"
  },

  {
    text: "The present moment is the only time over which we have dominion.",
    author: "Thich Nhat Hanh",
    category: "meditation"
  },

  {
    text: "The world waits, but your body won’t. Take care of it.",
    author: "Ritika Mishra",
    category: "fitness"
  },

  {
    text: "Wherever you are, be there totally.",
    author: "Eckhart Tolle",
    category: "meditation"
  },

  {
    text: "You can’t hustle through a broken system—especially your own.",
    author: "Ritika Mishra",
    category: "fitness"
  },

  {
    text: "Your mind isn’t noisy. It’s just unheard.",
    author: "Ritika Mishra",
    category: "fitness"
  },

  {
    text: "An apple a day keeps the doctor away.",
    author: "Proverb",
    category: "lifestyle"
  },
  {
    text: "Sleep is the best meditation.",
    author: "Dalai Lama",
    category: "lifestyle"
  },

  // General Wellness
  {
    text: "Wellness is the complete integration of body, mind, and spirit.",
    author: "Greg Anderson",
    category: "wellness"
  },
  {
    text: "The greatest wealth is health.",
    author: "Virgil",
    category: "wellness"
  },
  {
    text: "Slow is not weak. It's what sustainable feels like.",
    author: "Ritika Mishra",
    category: "wellness"
  },
  {
    text: "Happiness is the highest form of health.",
    author: "Dalai Lama",
    category: "wellness"
  },

];

// Utility functions for working with quotes
export const getRandomQuote = () => {
  const randomIndex = Math.floor(Math.random() * healthQuotes.length);
  return healthQuotes[randomIndex];
};

export const getQuotesByCategory = (category) => {
  return healthQuotes.filter(quote => quote.category === category);
};

export const getRandomQuoteByCategory = (category) => {
  const categoryQuotes = getQuotesByCategory(category);
  if (categoryQuotes.length === 0) return null;
  const randomIndex = Math.floor(Math.random() * categoryQuotes.length);
  return categoryQuotes[randomIndex];
};

export const getAllCategories = () => {
  return [...new Set(healthQuotes.map(quote => quote.category))];
};