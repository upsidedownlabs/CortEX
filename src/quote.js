// quotes.js - Health, Fitness, and Wellness Quotes Collection

export const healthQuotes = [
  // Fitness Quotes
  {
    text: "The groundwork for all happiness is good health.",
    author: "Leigh Hunt",
    category: "fitness"
  },
  
  
  {
    text: "Take care of your body. It's the only place you have to live.",
    author: "Jim Rohn",
    category: "fitness"
  },

  {
    text: "Peace comes from within. Do not seek it without.",
    author: "Buddha",
    category: "meditation"
  },
  {
    text: "Mindfulness is about being fully awake in our lives.",
    author: "Jon Kabat-Zinn",
    category: "meditation"
  },
  {
    text: "The present moment is the only time over which we have dominion.",
    author: "Thich Nhat Hanh",
    category: "meditation"
  },
  {
    text: "Wherever you are, be there totally.",
    author: "Eckhart Tolle",
    category: "meditation"
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