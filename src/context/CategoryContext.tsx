import React, { createContext, useContext, useState } from 'react';
import { useRouter } from 'expo-router';

interface CategoryContextType {
  selectedCategory: string;
  setSelectedCategory: (categoryId: string) => void;
  selectCategoryAndNavigate: (categoryId: string) => void;
}

const CategoryContext = createContext<CategoryContextType | undefined>(undefined);

export const CategoryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const router = useRouter();
  const [selectedCategory, setSelectedCategory] = useState<string>('burgers');

  const selectCategoryAndNavigate = (categoryId: string) => {
    setSelectedCategory(categoryId);
    router.navigate('/(tabs)/menu');
  };

  return (
    <CategoryContext.Provider
      value={{
        selectedCategory,
        setSelectedCategory,
        selectCategoryAndNavigate,
      }}
    >
      {children}
    </CategoryContext.Provider>
  );
};

export const useCategory = () => {
  const context = useContext(CategoryContext);
  if (!context) {
    throw new Error('useCategory must be used within a CategoryProvider');
  }
  return context;
};
