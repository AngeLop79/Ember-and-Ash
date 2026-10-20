import { MenuItem } from "@/types";

export const RESTAURANT_INFO = {
  name: "I ragazzi del sole",
  tagline: "Sapori alla brace, radicati nella tradizione",
  phone: "+393205666459",
  whatsapp: "+393205666459",
  email: "associazioneiragazzidelsole@gmail.com",
  address: "Viale Calabricata, Sellia Marina, Catanzaro, Italy",
  hours: {
    weekday: "19:00  – 00:00",
    weekend: "10:00 – 23:00",
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
  { id: "all", label: "Tutti" },
  { id: "starters", label: "Antipasti" },
  { id: "mains", label: "Piatti principali" },
  { id: "grills", label: "Griglia" },
  { id: "soups", label: "Zuppe" },
  { id: "sides", label: "Contorni" },
  { id: "drinks", label: "Bevande" },
  { id: "desserts", label: "Dolci" },
];

export const MENU_ITEMS: MenuItem[] = [
  {
    id: "1",
    name: "Lumache piccanti",
    description:
      "Lumache africane di grandi dimensioni, cotte lentamente nella nostra salsa piccante della casa con spezie aromatiche",
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
    name: "Spiedini di suya",
    description:
      "Teneri spiedini di manzo marinati in una pasta speziata di arachidi e grigliati a fiamma viva",
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
      "Zuppa tradizionale di foglie amare con carni miste, stoccafisso e olio di palma",
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
    name: "Riso jollof alla brace",
    description:
      "Riso al pomodoro dal gusto affumicato e dai bordi tostati, servito con pollo alla griglia e platano fritto",
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
    name: "Bistecca T-bone",
    description:
      "T-bone di prima scelta da 1 kg, cotta alla brace secondo il tuo gusto e servita con burro alle erbe e verdure arrosto",
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
    name: "Zuppa di egusi",
    description:
      "Semi di melone macinati, cotti con spinaci, carni miste, gamberetti e olio di palma",
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
    name: "Igname pestato",
    description:
      "Purè di igname morbido ed elastico, l’accompagnamento perfetto per ogni zuppa",
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
    name: "Platano fritto",
    description:
      "Platano maturo fritto fino a diventare dorato e caramellato: una specialità di Lagos",
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
      "Bevanda pregiata all’ibisco con zenzero, chiodi di garofano e agrumi, servita fredda",
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
      "Cocktail nigeriano classico con Fanta, Sprite, Ribena, cetriolo e bitter Angostura",
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
    name: "Zuppa piccante di pesce gatto",
    description:
      "Pesce gatto fresco in un intenso brodo piccante con foglie di uziza",
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
    name: "Tortino dal cuore morbido",
    description:
      "Tortino caldo al cioccolato dal cuore morbido, servito con gelato alla vaniglia",
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
    name: "Costolette d'agnello",
    description:
      "Costolette d’agnello tagliate alla francese, marinate alla menta e pepe e grigliate su brace di legna",
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
      "Carne di capra affumicata in una salsa intensa di peperoncino e cipolla, immancabile durante l’Owambe",
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
      "Zampetto di manzo speziato in una ricca crema di ugba e semi di palma, cotto lentamente a puntino",
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
  "12:00",
  "12:30",
  "13:00",
  "13:30",
  "14:00",
  "14:30",
  "15:00",
  "15:30",
  "16:00",
  "16:30",
  "17:00",
  "17:30",
  "18:00",
  "18:30",
  "19:00",
  "19:30",
  "20:00",
  "20:30",
  "21:00",
];
