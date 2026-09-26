/**
 * furnitureCatalog.js
 * Curated catalog of architectural furniture with real-world dimensions in cm.
 * Designed with diverse, boutique interior design material tones.
 * Grouped into 5 core architectural categories:
 * - Living Room
 * - Bedroom
 * - Dining & Office
 * - Kitchen
 * - Decor & Accents
 */

export const FURNITURE_CATEGORIES = [
  { id: 'living', name: 'Living Room' },
  { id: 'bedroom', name: 'Bedroom' },
  { id: 'nepali', name: 'Nepali Household' },
  { id: 'dining_office', name: 'Dining & Office' },
  { id: 'kitchen', name: 'Kitchen' },
  { id: 'decor', name: 'Decor & Accents' },
];

export const FURNITURE_CATALOG = [
  // ==========================================
  // LIVING ROOM (7 items)
  // ==========================================
  {
    id: 'sofa-3seat',
    name: '3-Seater Sofa',
    category: 'living',
    widthCm: 220,
    depthCm: 90,
    heightCm: 82,
    color: '#363D44', // Slate Charcoal
    cushionColor: '#454C54',
    legColor: '#1C1A17',
    shapeType: 'sofa',
  },
  {
    id: 'sofa-2seat',
    name: 'Loveseat',
    category: 'living',
    widthCm: 160,
    depthCm: 85,
    heightCm: 82,
    color: '#B25D34', // Terracotta Bouclé
    cushionColor: '#C46E44',
    legColor: '#2B1C12',
    shapeType: 'sofa',
  },
  {
    id: 'armchair',
    name: 'Lounge Armchair',
    category: 'living',
    widthCm: 85,
    depthCm: 85,
    heightCm: 76,
    color: '#9E5528', // Cognac Leather
    cushionColor: '#B26634',
    legColor: '#1F150E',
    shapeType: 'armchair',
  },
  {
    id: 'coffee-table',
    name: 'Coffee Table',
    category: 'living',
    widthCm: 110,
    depthCm: 60,
    heightCm: 42,
    color: '#D8D1C5', // Travertine Stone top
    subColor: '#C4BCAD',
    legColor: '#5C4028',
    shapeType: 'coffee-table',
  },
  {
    id: 'side-table',
    name: 'Round Side Table',
    category: 'living',
    widthCm: 45,
    depthCm: 45,
    heightCm: 50,
    color: '#D0C8B8', // Fluted Travertine
    subColor: '#B8AF9E',
    legColor: '#4A3728',
    shapeType: 'side-table',
  },
  {
    id: 'media-console',
    name: 'Media TV Console',
    category: 'living',
    widthCm: 180,
    depthCm: 45,
    heightCm: 50,
    color: '#523820', // Dark Walnut
    subColor: '#362414',
    legColor: '#1C1A17',
    shapeType: 'credenza',
  },
  {
    id: 'tv-43',
    name: '43" Television',
    category: 'living',
    widthCm: 110,
    depthCm: 12,
    heightCm: 70,
    color: '#17191B',
    subColor: '#303438',
    shapeType: 'tv',
    stackableOn: ['media-console'],
    placement: 'surface',
  },
  {
    id: 'ottoman',
    name: 'Upholstered Ottoman',
    category: 'living',
    widthCm: 80,
    depthCm: 60,
    heightCm: 42,
    color: '#8A7968', // Warm Greige Wool
    cushionColor: '#9C8B7A',
    legColor: '#241F1A',
    shapeType: 'ottoman',
  },

  // ==========================================
  // BEDROOM (8 items)
  // ==========================================
  {
    id: 'bed-king',
    name: 'King Bed',
    category: 'bedroom',
    widthCm: 193,
    depthCm: 203,
    heightCm: 105,
    color: '#B28E61', // White Oak
    fabricColor: '#FAF6EE',
    headboardColor: '#4E4942',
    accentColor: '#B8AB96',
    shapeType: 'bed',
  },
  {
    id: 'bed-queen',
    name: 'Queen Bed',
    category: 'bedroom',
    widthCm: 152,
    depthCm: 203,
    heightCm: 100,
    color: '#634932', // Walnut
    fabricColor: '#FAF6EE',
    headboardColor: '#806F5B',
    accentColor: '#516457',
    shapeType: 'bed',
  },
  {
    id: 'bed-single',
    name: 'Single Bed',
    category: 'bedroom',
    widthCm: 100,
    depthCm: 190,
    heightCm: 85,
    color: '#C9B28D', // Scandinavian Birch
    fabricColor: '#FAF6EE',
    headboardColor: '#706152',
    accentColor: '#C47E4D',
    shapeType: 'bed',
  },
  {
    id: 'bed-bunk',
    name: 'Modern Bunk Bed',
    category: 'bedroom',
    widthCm: 100,
    depthCm: 195,
    heightCm: 165,
    color: '#4E5F55', // Sage Timber Frame
    fabricColor: '#FAF6EE',
    accentColor: '#C97B4A', // Ladder & accent rungs
    shapeType: 'bed-bunk',
  },
  {
    id: 'nightstand',
    name: 'Nightstand',
    category: 'bedroom',
    widthCm: 50,
    depthCm: 40,
    heightCm: 52,
    color: '#B28E61', // Oak
    subColor: '#FAF6EE',
    legColor: '#2B1F13',
    shapeType: 'nightstand',
  },
  {
    id: 'wardrobe-3door',
    name: '3-Door Wardrobe',
    category: 'bedroom',
    widthCm: 180,
    depthCm: 60,
    heightCm: 210,
    color: '#5C5750', // Greige Lacquer
    subColor: '#3E3A34',
    handleColor: '#C4A869',
    shapeType: 'wardrobe',
  },
  {
    id: 'wardrobe-2door',
    name: '2-Door Wardrobe',
    category: 'bedroom',
    widthCm: 120,
    depthCm: 60,
    heightCm: 210,
    color: '#6E5238', // Smoked Oak
    subColor: '#473422',
    handleColor: '#B89658',
    shapeType: 'wardrobe',
  },
  {
    id: 'chest-drawers',
    name: 'Chest of Drawers',
    category: 'bedroom',
    widthCm: 90,
    depthCm: 50,
    heightCm: 95,
    color: '#8A6848', // Warm Oak
    subColor: '#59412B',
    shapeType: 'chest-drawers',
  },
  {
    id: 'vanity-dresser',
    name: 'Vanity with Mirror',
    category: 'bedroom',
    widthCm: 110,
    depthCm: 48,
    heightCm: 135,
    color: '#7A5E43', // Smoked Oak
    subColor: '#B8976C',
    mirrorColor: '#9FC3D2',
    handleColor: '#C4A869',
    shapeType: 'vanity-dresser',
  },

  // ==========================================
  // DINING & OFFICE (7 items)
  // ==========================================
  {
    id: 'dining-table-large',
    name: '6-Person Dining Table',
    category: 'dining_office',
    widthCm: 180,
    depthCm: 90,
    heightCm: 75,
    color: '#B59671', // Natural Oak
    subColor: '#9C7E5A',
    legColor: '#1E1D1B',
    shapeType: 'table',
  },
  {
    id: 'dining-table-round',
    name: 'Round Dining Table',
    category: 'dining_office',
    widthCm: 115,
    depthCm: 115,
    heightCm: 75,
    color: '#B59671',
    subColor: '#9C7E5A',
    legColor: '#1E1D1B',
    shapeType: 'table-round',
  },
  {
    id: 'dining-chair',
    name: 'Cane Dining Chair',
    category: 'dining_office',
    widthCm: 50,
    depthCm: 52,
    heightCm: 82,
    color: '#242220', // Blackened Ash
    cushionColor: '#BFAD91', // Woven cane
    legColor: '#141312',
    shapeType: 'chair',
  },
  {
    id: 'bar-stool',
    name: 'Counter Bar Stool',
    category: 'dining_office',
    widthCm: 42,
    depthCm: 42,
    heightCm: 92,
    color: '#242220', // Ash frame
    cushionColor: '#9E5528', // Cognac leather seat
    legColor: '#141312',
    shapeType: 'bar-stool',
  },
  {
    id: 'desk-executive',
    name: 'Writing Desk',
    category: 'dining_office',
    widthCm: 140,
    depthCm: 70,
    heightCm: 75,
    color: '#63442A', // Walnut
    subColor: '#2B2E31',
    legColor: '#222222',
    shapeType: 'desk',
  },
  {
    id: 'desk-chair',
    name: 'Office Swivel Chair',
    category: 'dining_office',
    widthCm: 65,
    depthCm: 65,
    heightCm: 95,
    color: '#2F3438', // Charcoal Mesh
    cushionColor: '#3E444A',
    legColor: '#181818',
    shapeType: 'desk-chair',
  },
  {
    id: 'sideboard-buffet',
    name: 'Sideboard Buffet',
    category: 'dining_office',
    widthCm: 150,
    depthCm: 45,
    heightCm: 80,
    color: '#6E4E32', // Rich Walnut
    subColor: '#4A3420',
    handleColor: '#C4A869',
    legColor: '#1C1A17',
    shapeType: 'sideboard',
  },

  // ==========================================
  // KITCHEN (6 items)
  // ==========================================
  {
    id: 'kitchen-island',
    name: 'Kitchen Prep Island',
    category: 'kitchen',
    widthCm: 150,
    depthCm: 70,
    heightCm: 92,
    color: '#E8E1D5', // Calacatta White top
    subColor: '#4E5F55', // Sage Cabinet Base
    legColor: '#3A4840',
    shapeType: 'kitchen-island',
  },
  {
    id: 'kitchen-counter',
    name: 'Base Counter & Sink',
    category: 'kitchen',
    widthCm: 160,
    depthCm: 65,
    heightCm: 90,
    color: '#DDD7CB', // Quartz top
    subColor: '#38423B', // Deep Pine base
    metalColor: '#A4ADB4', // Stainless sink & tap
    shapeType: 'kitchen-counter',
  },
  {
    id: 'kitchen-stove',
    name: 'Range Stove & Oven',
    category: 'kitchen',
    widthCm: 76,
    depthCm: 65,
    heightCm: 90,
    color: '#26292B', // Cast iron grates
    subColor: '#52575C', // Brushed stainless body
    accentColor: '#141414', // Burners
    shapeType: 'kitchen-stove',
  },
  {
    id: 'kitchen-fridge',
    name: 'French Door Fridge',
    category: 'kitchen',
    widthCm: 85,
    depthCm: 75,
    heightCm: 180,
    color: '#7D848C', // Stainless Steel
    subColor: '#5E646A',
    handleColor: '#1C1D1F',
    shapeType: 'kitchen-fridge',
  },
  {
    id: 'dining-nook',
    name: 'Dining Nook L-Bench',
    category: 'kitchen',
    widthCm: 140,
    depthCm: 120,
    heightCm: 85,
    color: '#8A6848', // Oak plinth base
    cushionColor: '#C2B6A3', // Oatmeal linen upholstery
    shapeType: 'dining-nook',
  },
  {
    id: 'pantry-cabinet',
    name: 'Tall Pantry Cabinet',
    category: 'kitchen',
    widthCm: 80,
    depthCm: 60,
    heightCm: 200,
    color: '#455047', // Deep Sage
    subColor: '#323A33',
    handleColor: '#C4A869',
    shapeType: 'pantry-cabinet',
  },

  // ==========================================
  // DECOR & ACCENTS (6 items)
  // ==========================================
  {
    id: 'rug-living',
    name: 'Nepali Galaicha Rug',
    category: 'decor',
    widthCm: 240,
    depthCm: 300,
    heightCm: 1.5,
    color: '#8B1E1E', // Crimson Madder Red (नेपाली गलैँचा)
    subColor: '#D4A359', // Mustard Gold border/mandala
    accentColor: '#1B2A4A', // Tibetan Indigo Navy
    shapeType: 'rug',
  },
  {
    id: 'rug-runner',
    name: 'Galaicha Runner Rug',
    category: 'decor',
    widthCm: 80,
    depthCm: 250,
    heightCm: 1.5,
    color: '#1E2D42', // Deep Indigo Blue
    subColor: '#C49746', // Warm Gold Border
    accentColor: '#8A2020', // Ruby Crimson accents
    shapeType: 'rug-runner',
  },
  {
    id: 'floor-plant',
    name: 'Potted Fiddle Leaf',
    category: 'decor',
    widthCm: 55,
    depthCm: 55,
    heightCm: 130,
    color: '#385343', // Deep Botanical Green
    subColor: '#D4CABB', // Fluted Ceramic Pot
    shapeType: 'plant',
  },
  {
    id: 'floor-lamp',
    name: 'Arc Floor Lamp',
    category: 'decor',
    widthCm: 45,
    depthCm: 45,
    heightCm: 155,
    color: '#1C1A17', // Black Steel Arm
    subColor: '#FAF6EE', // Linen Dome Shade
    shapeType: 'lamp',
  },
  {
    id: 'wall-mirror',
    name: 'Standing Floor Mirror',
    category: 'decor',
    widthCm: 60,
    depthCm: 20,
    heightCm: 160,
    color: '#A0805B', // Warm Oak Frame
    mirrorColor: '#B0D3E2', // Polished Silver Glass
    shapeType: 'wall-mirror',
  },
  {
    id: 'bookshelf',
    name: '4-Tier Bookshelf',
    category: 'decor',
    widthCm: 90,
    depthCm: 35,
    heightCm: 180,
    color: '#94734E', // Oak Frame
    subColor: '#6B5134',
    shapeType: 'bookshelf',
  },

  // ==========================================
  // NEPALI HOUSEHOLD (6 items)
  // Traditional handcrafted Himalayan interior pieces
  // ==========================================
  {
    id: 'nepali-pirka',
    name: 'Pirka Low Stool',
    nepaliName: 'पिर्का',
    category: 'nepali',
    widthCm: 45,
    depthCm: 25,
    heightCm: 16,
    color: '#6B3E26', // Aged Sal Wood Timber
    accentColor: '#1A1615',
    shapeType: 'nepali-pirka',
  },
  {
    id: 'nepali-charpai',
    name: 'Charpai Daybed',
    nepaliName: 'खाट',
    category: 'nepali',
    widthCm: 190,
    depthCm: 90,
    heightCm: 48,
    color: '#5C3826', // Turned Timber Posts
    fabricColor: '#D8B885', // Woven Jute Webbing
    cushionColor: '#8B2635', // Crimson Bolster
    shapeType: 'nepali-charpai',
  },
  {
    id: 'nepali-gadda',
    name: 'Gadda Floor Seating',
    nepaliName: 'सुकुल/गद्दा',
    category: 'nepali',
    widthCm: 180,
    depthCm: 85,
    heightCm: 18,
    color: '#8B2635', // Deep Maroon Cotton Mattress
    cushionColor: '#22485E', // Indigo Cylindrical Bolsters
    accentColor: '#C49746', // Brass/Gold Piping
    shapeType: 'nepali-gadda',
  },
  {
    id: 'nepali-dhoka-divider',
    name: 'Carved Jali Screen',
    nepaliName: 'काष्ठ जाली',
    category: 'nepali',
    widthCm: 120,
    depthCm: 28,
    heightCm: 175,
    color: '#3A2016', // Dark Carved Timber Frame
    accentColor: '#C49746', // Brass Pivot Hinges
    subColor: '#5C3524', // Lattice Fretwork
    shapeType: 'nepali-dhoka-divider',
  },
  {
    id: 'nepali-puja-mandir',
    name: 'Puja Shrine Shelf',
    nepaliName: 'पूजा मन्दिर',
    category: 'nepali',
    widthCm: 70,
    depthCm: 40,
    heightCm: 95,
    color: '#542E1B', // Rich Sal Timber Shrine
    accentColor: '#C49746', // Brass Gajur Finial & Bells
    subColor: '#8B2635', // Crimson Altar Cloth
    shapeType: 'nepali-puja-mandir',
  },
  {
    id: 'nepali-lota-display',
    name: 'Karuwa & Diyo Stand',
    nepaliName: 'करुवा स्ट्यान्ड',
    category: 'nepali',
    widthCm: 38,
    depthCm: 38,
    heightCm: 72,
    color: '#4A2A1A', // Tripod Pedestal Stand
    accentColor: '#C49746', // Polished Patan Brass Karuwa
    subColor: '#D4AA55', // Oil Lamp Diyo Dish
    shapeType: 'nepali-lota-display',
  },
  {
    id: 'nepali-dhaka-rug',
    name: 'Dhaka Pattern Rug',
    nepaliName: 'ढाका गलैँचा',
    category: 'nepali',
    widthCm: 180,
    depthCm: 240,
    heightCm: 1.5,
    color: '#8B2635',
    subColor: '#D4AA55',
    accentColor: '#22485E',
    shapeType: 'nepali-dhaka-rug',
  },
  {
    id: 'nepali-chowki',
    name: 'Carved Wooden Chowki',
    nepaliName: 'काठको चौकी',
    category: 'nepali',
    widthCm: 55,
    depthCm: 40,
    heightCm: 32,
    color: '#542E1B',
    accentColor: '#C49746',
    shapeType: 'nepali-chowki',
  },
  {
    id: 'nepali-patuka-chest',
    name: 'Patuka Storage Chest',
    nepaliName: 'पटुका सन्दुक',
    category: 'nepali',
    widthCm: 90,
    depthCm: 48,
    heightCm: 58,
    color: '#5C3524',
    subColor: '#3A2016',
    accentColor: '#C49746',
    shapeType: 'nepali-patuka-chest',
  },
  {
    id: 'nepali-brass-diya',
    name: 'Brass Diya Lamp',
    nepaliName: 'पित्तलको दियो',
    category: 'nepali',
    widthCm: 28,
    depthCm: 28,
    heightCm: 22,
    color: '#C49746',
    accentColor: '#F3C969',
    shapeType: 'nepali-brass-diya',
  },
];

export function getFurnitureType(id) {
  return FURNITURE_CATALOG.find((item) => item.id === id) || null;
}
