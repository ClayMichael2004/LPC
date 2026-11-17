import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'expo-router';
import { Category, Product } from '../types';
import { CATEGORIES, PRODUCTS } from '../constants/menuData';
import { menuApi } from '../services/api';

interface CategoryContextType {
  selectedCategory: string;
  setSelectedCategory: (categoryId: string) => void;
  selectCategoryAndNavigate: (categoryId: string) => void;
  categories: Category[];
  products: Product[];
  refreshMenu: () => Promise<void>;
}

const CategoryContext = createContext<CategoryContextType | undefined>(undefined);

export const CategoryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const router = useRouter();
  const [selectedCategory, setSelectedCategory] = useState<string>('burgers');
  const [categories, setCategories] = useState<Category[]>(CATEGORIES);
  const [products, setProducts] = useState<Product[]>(PRODUCTS);

  const refreshMenu = useCallback(async () => {
    try {
      const data = await menuApi.getFullMenu();
      if (data.categories && data.categories.length > 0) {
        setCategories(data.categories);
      }
      if (data.products && data.products.length > 0) {
        setProducts(data.products);
      }
    } catch {
      // Keep local static fallback if backend is unreachable
    }
  }, []);

  useEffect(() => {
    refreshMenu();
  }, [refreshMenu]);

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
        categories,
        products,
        refreshMenu,
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
