import { MenuItem } from "@/types";

export const RESTAURANT_INFO = {
  name: "I ragazzi del sole",
  tagline: "Fire-crafted flavours, rooted in tradition",
  phone: "+2347065968213",
  whatsapp: "+2347065968213",
  email: "hello@emberandash.com",
  address: "14 Wetheral Road, Owerri, Imo State",
  hours: {
    weekday: "11:00 AM – 10:00 PM",
    weekend: "10:00 AM – 11:00 PM",
  },
  closingHour: {
    weekday: 22,
    weekend: 23,
  },
  deliveryRadius: "10km",
  deliveryFee: 500,
  freeDeliveryAbove: 8000,
};

export const CATEGORIES = [
  { id: "all", label: "All" },
  { id: "starters", label: "Starters" },
  { id: "mains", label: "Mains" },
  { id: "grills", label: "Grills" },
  { id: "soups", label: "Soups" },
  { id: "sides", label: "Sides" },
  { id: "drinks", label: "Drinks" },
  { id: "desserts", label: "Desserts" },
];

export const MENU_ITEMS: MenuItem[] = [
  {
    id: "1",
    name: "Peppered Snail",
    description:
      "Giant African snails slow-cooked in our signature pepper sauce with aromatic spices",
    price: 4500,
    category: "starters",
    image:
      "https://i.pinimg.com/originals/c3/90/c5/c390c5396fa33d092e0030186be38e69.jpg",
    tags: ["spicy", "popular"],
    available: true,
    featured: true,
    spiceLevel: 2,
    prepTime: 15,
  },
  {
    id: "2",
    name: "Suya Skewers",
    description:
      "Tender beef skewers marinated in spiced groundnut paste, grilled over open flame",
    price: 3800,
    category: "grills",
    image:
      "https://images.unsplash.com/photo-1544025162-d76694265947?w=600&q=80",
    tags: ["grilled", "popular", "bestseller"],
    available: true,
    featured: true,
    spiceLevel: 1,
    prepTime: 20,
  },
  {
    id: "3",
    name: "Ofe Onugbu",
    description:
      "Traditional bitter leaf soup with assorted meat, stockfish and palm oil",
    price: 5200,
    category: "soups",
    image:
      "https://tse4.mm.bing.net/th/id/OIP.mYKOCyaqEwrh6PvMD6DnUgHaE4?rs=1&pid=ImgDetMain&o=7&rm=3",
    tags: ["traditional", "hearty"],
    available: true,
    featured: false,
    spiceLevel: 1,
    prepTime: 25,
  },
  {
    id: "4",
    name: "Ember Jollof Rice",
    description:
      "Smoky tomato-based rice with charred edges, served with grilled chicken & fried plantain",
    price: 4800,
    category: "mains",
    image:
      "https://tse1.mm.bing.net/th/id/OIP.8u0ljZC2sFTUW2r7s6H-wwHaJQ?w=2448&h=3059&rs=1&pid=ImgDetMain&o=7&rm=3",
    tags: ["popular", "bestseller"],
    available: true,
    featured: true,
    spiceLevel: 1,
    prepTime: 20,
  },
  {
    id: "5",
    name: "T-Bone Steak",
    description:
      "1kg prime T-bone, flame-grilled to your preference with herb butter & roasted vegetables",
    price: 18500,
    category: "grills",
    image:
      "https://tse1.explicit.bing.net/th/id/OIP.C4TwLl0rM1phue0Vrlz3KwHaHa?rs=1&pid=ImgDetMain&o=7&rm=3",
    tags: ["premium", "grill"],
    available: true,
    featured: true,
    spiceLevel: 0,
    prepTime: 30,
  },
  {
    id: "6",
    name: "Egusi Soup",
    description:
      "Ground melon seeds cooked with spinach, assorted meats and crayfish in palm oil",
    price: 4900,
    category: "soups",
    image:
      "https://i.pinimg.com/originals/57/fb/c3/57fbc3f4f9d1c5cb17955498947730ea.jpg",
    tags: ["traditional"],
    available: true,
    featured: false,
    spiceLevel: 1,
    prepTime: 25,
  },
  {
    id: "7",
    name: "Pounded Yam",
    description:
      "Smooth, stretchy pounded yam — the perfect swallow for any soup",
    price: 1200,
    category: "sides",
    image:
      "https://th.bing.com/th/id/R.a3ba2285d39575b527a6e3357b757df6?rik=Cz27xh3XLe8xOg&pid=ImgRaw&r=0",
    tags: ["sides", "swallow"],
    available: true,
    featured: false,
    spiceLevel: 0,
    prepTime: 10,
  },
  {
    id: "8",
    name: "Fried Plantain",
    description:
      "Ripe plantains fried golden and caramelized — a Lagos essential",
    price: 900,
    category: "sides",
    image:
      "https://tse4.mm.bing.net/th/id/OIP.Srv0mCjs-55QBbuYgkZofAHaE7?rs=1&pid=ImgDetMain&o=7&rm=3",
    tags: ["sides", "vegetarian"],
    available: true,
    featured: false,
    spiceLevel: 0,
    prepTime: 8,
  },
  {
    id: "9",
    name: "Zobo Royale",
    description:
      "Premium hibiscus drink infused with ginger, cloves and citrus. Served chilled.",
    price: 1500,
    category: "drinks",
    image:
      "https://th.bing.com/th/id/OIP.nFetB8AII_HWO3LiSCXK1AHaHf?o=7rm=3&rs=1&pid=ImgDetMain&o=7&rm=3",
    tags: ["drinks", "non-alcoholic"],
    available: true,
    featured: false,
    spiceLevel: 0,
    prepTime: 5,
  },
  {
    id: "10",
    name: "Chapman",
    description:
      "Classic Nigerian cocktail — Fanta, Sprite, Ribena, cucumber and Angostura bitters",
    price: 1800,
    category: "drinks",
    image:
      "https://www.africanrecipes.com.ng/wp-content/uploads/2025/08/chapman-drink-featured.png",
    tags: ["drinks", "cocktail", "popular"],
    available: true,
    featured: false,
    spiceLevel: 0,
    prepTime: 5,
  },
  {
    id: "11",
    name: "Catfish Pepper Soup",
    description:
      "Fresh point-and-kill catfish in fiery pepper soup broth with uziza leaves",
    price: 6500,
    category: "soups",
    image:
      "https://th.bing.com/th/id/R.a89e498830c7275925c1e4b37ed6cdc2?rik=PdeJ0ONjDqaw2Q&riu=http%3a%2f%2fwww.allnigerianrecipes.com%2fimages%2fcatfish-pepper-soup.jpg&ehk=UWwHEjVUsYBYSzB6jqVm1DOWXm0W3H7RD1I38fU2dlA%3d&risl=&pid=ImgRaw&r=0",
    tags: ["spicy", "seafood"],
    available: true,
    featured: false,
    spiceLevel: 3,
    prepTime: 20,
  },
  {
    id: "12",
    name: "Lava Cake",
    description:
      "Warm chocolate fondant with molten centre, served with vanilla ice cream",
    price: 2800,
    category: "desserts",
    image:
      "https://insanelygoodrecipes.com/wp-content/uploads/2024/12/Lava-Cake-2-683x1024.jpg",
    tags: ["desserts", "chocolate"],
    available: true,
    featured: false,
    spiceLevel: 0,
    prepTime: 15,
  },
  {
    id: "13",
    name: "Lamb Chops",
    description:
      "French-cut lamb chops in mint-pepper marinade, grilled over hardwood charcoal",
    price: 12000,
    category: "grills",
    image:
      "https://tse4.mm.bing.net/th/id/OIP.j27h9uzQHuHa1YOl4Fzw9wHaLH?rs=1&pid=ImgDetMain&o=7&rm=3",
    tags: ["premium", "grill"],
    available: true,
    featured: false,
    spiceLevel: 1,
    prepTime: 25,
  },
  {
    id: "14",
    name: "Asun",
    description:
      "Smoked goat meat in a ferocious pepper and onion sauce — an Owambe staple",
    price: 5500,
    category: "starters",
    image:
      "https://tse3.mm.bing.net/th/id/OIP.JQPvTYmXqo_H-s_BUW6MEwHaKL?rs=1&pid=ImgDetMain&o=7&rm=3",
    tags: ["spicy", "smoky"],
    available: true,
    featured: false,
    spiceLevel: 3,
    prepTime: 15,
  },
  {
    id: "15",
    name: "Nkwobi",
    description:
      "Spiced cow foot in a rich ugba and palm kernel paste — slow cooked to perfection",
    price: 5800,
    category: "starters",
    image:
      "https://tse2.mm.bing.net/th/id/OIP.Zazj-ilNUw0KqJNxc3rWYAHaJ4?rs=1&pid=ImgDetMain&o=7&rm=3",
    tags: ["traditional", "spicy"],
    available: true,
    featured: false,
    spiceLevel: 2,
    prepTime: 20,
  },
];

export const TIMES = [
  "12:00 PM",
  "12:30 PM",
  "1:00 PM",
  "1:30 PM",
  "2:00 PM",
  "2:30 PM",
  "3:00 PM",
  "3:30 PM",
  "4:00 PM",
  "4:30 PM",
  "5:00 PM",
  "5:30 PM",
  "6:00 PM",
  "6:30 PM",
  "7:00 PM",
  "7:30 PM",
  "8:00 PM",
  "8:30 PM",
  "9:00 PM",
];
