import { Category, Product } from '../types';

export const CATEGORIES: Category[] = [
  {
    id: 'burgers',
    name: 'Polo Burgers',
    image: require('../../assets/images/cat-grid-1.png'),
  },
  {
    id: 'for-me',
    name: 'For Me',
    image: require('../../assets/images/cat-grid-2.png'),
  },
  {
    id: 'for-us',
    name: 'For Us',
    image: require('../../assets/images/cat-grid-3.png'),
  },
  {
    id: 'box-meals',
    name: 'Box Meals',
    image: require('../../assets/images/cat-grid-4.png'),
  },
  {
    id: 'artisan-coffee',
    name: 'Artisan Coffee',
    image: require('../../assets/images/cold-brew.jpg'),
  },
  {
    id: 'breakfast',
    name: 'Breakfast & Brunch',
    image: require('../../assets/images/pancakes.jpg'),
  },
  {
    id: 'pastries',
    name: 'Pastries & Desserts',
    image: require('../../assets/images/croissant.jpg'),
  },
  {
    id: 'drinks',
    name: 'Drinks',
    image: require('../../assets/images/soda-2l.png'),
  },
];

export const MENU_TABS = [
  { id: 'burgers', name: 'Burgers' },
  { id: 'for-me', name: 'For Me' },
  { id: 'for-us', name: 'For Us' },
  { id: 'box-meals', name: 'Box Meals' },
  { id: 'artisan-coffee', name: 'Artisan Coffee' },
  { id: 'breakfast', name: 'Breakfast & Brunch' },
  { id: 'drinks', name: 'Drinks' },
  { id: 'pastries', name: 'Desserts' },
];

export const PRODUCTS: Product[] = [
  // BURGERS
  {
    id: 'big-boss-burger',
    name: 'Big Boss Burger',
    category: 'burgers',
    price: 850,
    description: 'Double grilled patties with melted cheese, fresh tomato, crisp lettuce, and Little Polo house relish.',
    image: require('../../assets/images/burger-boss.png'),
    hasOptions: true,
    optionsGroup: {
      id: 'burger-sauce',
      title: 'Choose Your Sauce',
      required: true,
      min: 1,
      max: 1,
      options: [
        { id: 'house-relish', name: 'Little Polo House Relish' },
        { id: 'smoky-bbq', name: 'Smoky BBQ Sauce' },
        { id: 'spicy-mayo', name: 'Spicy Chili Mayo' },
      ],
    },
  },
  {
    id: 'big-boss-burger-meal',
    name: 'Big Boss Burger Meal',
    category: 'burgers',
    price: 1200,
    description: 'Big Boss Burger served with golden seasoned fries and a 500ml cold beverage.',
    image: require('../../assets/images/burger-meal.png'),
    hasOptions: true,
    optionsGroup: {
      id: 'meal-drink',
      title: 'Choose Your Meal Drink',
      required: true,
      min: 1,
      max: 1,
      options: [
        { id: 'coke', name: 'Coke 500ml' },
        { id: 'fanta', name: 'Fanta Orange 500ml' },
        { id: 'sprite', name: 'Sprite 500ml' },
      ],
    },
  },
  {
    id: 'colonel-burger',
    name: 'Colonel Burger',
    category: 'burgers',
    price: 650,
    description: 'Crispy golden fried breast fillet with creamy mayo and crunchy iceberg lettuce on a toasted bun.',
    image: require('../../assets/images/burger-colonel.png'),
    hasOptions: false,
  },
  {
    id: 'crunch-burger',
    name: 'Crunch Burger',
    category: 'burgers',
    price: 490,
    description: 'Crisp chicken patty with cheese slice and creamy garlic drizzle.',
    image: require('../../assets/images/burger-crunch.png'),
    hasOptions: false,
  },
  {
    id: 'streetwise-3-crunch',
    name: 'Streetwise 3 Crunch',
    category: 'for-me',
    price: 650,
    description: '3 succulent crispy chicken pieces with salted fries.',
    image: require('../../assets/images/burger-crunch.png'),
    hasOptions: false,
  },
  {
    id: 'nyama-nyama-burger',
    name: 'Nyama Nyama Burger',
    category: 'burgers',
    price: 900,
    description: 'All-meat signature burger loaded with double bacon, caramelized onions, and cheddar melt.',
    image: require('../../assets/images/burger-boss.png'),
    hasOptions: false,
  },

  // DRINKS
  {
    id: '2l-soda',
    name: '2L Soda',
    category: 'drinks',
    price: 350,
    description: 'Chilled 2 Liter refreshing beverage to share.',
    image: require('../../assets/images/soda-2l.png'),
    hasOptions: true,
    optionsGroup: {
      id: 'soda-flavor',
      title: 'Choose Your Soda Flavor',
      required: true,
      min: 1,
      max: 1,
      options: [
        { id: 'coke', name: 'Coke' },
        { id: 'fanta-orange', name: 'Fanta Orange' },
        { id: 'sprite', name: 'Sprite' },
      ],
    },
  },
  {
    id: '1l-soda',
    name: '1l Soda',
    category: 'drinks',
    price: 250,
    description: 'Chilled 1 Liter beverage.',
    image: require('../../assets/images/soda-2l.png'),
    hasOptions: true,
    optionsGroup: {
      id: 'soda-flavor-1l',
      title: 'Choose Your Soda Flavor',
      required: true,
      min: 1,
      max: 1,
      options: [
        { id: 'coke', name: 'Coke' },
        { id: 'fanta-orange', name: 'Fanta Orange' },
        { id: 'sprite', name: 'Sprite' },
      ],
    },
  },
  {
    id: '500ml-soda',
    name: '500ml Soda',
    category: 'drinks',
    price: 150,
    description: 'Chilled 500ml single serve bottle.',
    image: require('../../assets/images/soda-2l.png'),
    hasOptions: true,
    optionsGroup: {
      id: 'soda-flavor-500ml',
      title: 'Choose Your Soda Flavor',
      required: true,
      min: 1,
      max: 1,
      options: [
        { id: 'coke', name: 'Coke' },
        { id: 'fanta-orange', name: 'Fanta Orange' },
        { id: 'sprite', name: 'Sprite' },
      ],
    },
  },
  {
    id: '350ml-soda',
    name: '350ml Soda',
    category: 'drinks',
    price: 100,
    description: 'Pocket size refreshing cold soda.',
    image: require('../../assets/images/soda-2l.png'),
    hasOptions: true,
    optionsGroup: {
      id: 'soda-flavor-350ml',
      title: 'Choose Your Soda Flavor',
      required: true,
      min: 1,
      max: 1,
      options: [
        { id: 'coke', name: 'Coke' },
        { id: 'fanta-orange', name: 'Fanta Orange' },
        { id: 'sprite', name: 'Sprite' },
      ],
    },
  },

  // ARTISAN COFFEE
  {
    id: 'cold-brew-vanilla',
    name: 'Cold Brew Vanilla Sweet Cream',
    category: 'artisan-coffee',
    price: 450,
    description: '18-hour slow-steeped Kenyan single origin coffee finished with handcrafted vanilla sweet cream.',
    image: require('../../assets/images/cold-brew.jpg'),
    hasOptions: true,
    optionsGroup: {
      id: 'milk-choice',
      title: 'Choose Your Milk Preference',
      required: true,
      min: 1,
      max: 1,
      options: [
        { id: 'whole-milk', name: 'Fresh Whole Milk' },
        { id: 'oat-milk', name: 'Oat Milk' },
        { id: 'almond-milk', name: 'Almond Milk' },
      ],
    },
  },
  {
    id: 'spanish-latte',
    name: 'Iced Spanish Latte',
    category: 'artisan-coffee',
    price: 420,
    description: 'Espresso poured over condensed milk and chilled fresh milk.',
    image: require('../../assets/images/latte.jpg'),
    hasOptions: false,
  },

  // BREAKFAST & BRUNCH
  {
    id: 'pancake-stack',
    name: 'Fluffy Buttermilk Pancake Stack',
    category: 'breakfast',
    price: 600,
    description: 'Triple stack served with pure butter, Kisumu wildflower honey, and wild berries.',
    image: require('../../assets/images/pancakes.jpg'),
    hasOptions: false,
  },

  // PASTRIES & DESSERTS
  {
    id: 'flaky-croissant',
    name: 'Butter Flaky Croissant',
    category: 'pastries',
    price: 280,
    description: 'Golden laminated pastry freshly baked every morning.',
    image: require('../../assets/images/croissant.jpg'),
    hasOptions: false,
  },

  // BOX MEALS
  {
    id: 'polo-solo-box',
    name: 'Polo Solo Feast Box',
    category: 'box-meals',
    price: 1100,
    description: 'Big Boss Burger, 2 crispy wings, large fries, and 500ml soda.',
    image: require('../../assets/images/cat-grid-4.png'),
    hasOptions: false,
  },
  {
    id: 'lake-sharing-box',
    name: 'Lake Breeze Sharing Box',
    category: 'for-us',
    price: 2400,
    description: '4 Burgers, 8 crispy tenders, family fries, and 2L soda.',
    image: require('../../assets/images/cat-grid-3.png'),
    hasOptions: false,
  },
];

export const PROMO_BANNERS = [
  {
    id: 'promo-1',
    title: 'KENTUCKY TOWN 254',
    subtitle: 'EDITION SPECIALS',
    image: require('../../assets/images/hero-banner-promo.jpg'),
  },
  {
    id: 'promo-2',
    title: 'LITTLE POLO ARTISAN BREWS',
    subtitle: 'Single Origin Kisumu Roasts & Cold Brews',
    image: require('../../assets/images/hero-promo1.jpg'),
  },
  {
    id: 'promo-3',
    title: 'SUNSET LAKEFRONT BRUNCH',
    subtitle: 'Fresh Bakes & Gourmet Brioche Melts',
    image: require('../../assets/images/hero-promo2.jpg'),
  },
];
