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
  { id: 'bathroom', name: 'Bathroom & Utility' },
  { id: 'custom', name: 'My Furniture' },
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
    heightCm: 36,
    color: '#8B2635', // Deep Maroon Cotton Mattress
    cushionColor: '#22485E', // Indigo Cylindrical Bolsters
    accentColor: '#C49746', // Brass/Gold Piping
    shapeType: 'nepali-gadda',
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

  // ==========================================
  // BATHROOM & UTILITY
  // ==========================================
  {
    id: 'toilet',
    name: 'Toilet (WC)',
    category: 'bathroom',
    widthCm: 40,
    depthCm: 70,
    heightCm: 78,
    color: '#F4F4F1',
    subColor: '#D9D9D4',
    shapeType: 'fixture-toilet',
  },
  {
    id: 'wash-basin',
    name: 'Wash Basin',
    category: 'bathroom',
    widthCm: 60,
    depthCm: 45,
    heightCm: 85,
    color: '#F4F4F1',
    subColor: '#C9CED1',
    shapeType: 'fixture-basin',
  },
  {
    id: 'shower-tray',
    name: 'Shower Enclosure',
    category: 'bathroom',
    widthCm: 90,
    depthCm: 90,
    heightCm: 200,
    color: '#DCE6EA',
    subColor: '#9FB4BD',
    shapeType: 'fixture-shower',
  },
  {
    id: 'bathtub',
    name: 'Bathtub',
    category: 'bathroom',
    widthCm: 170,
    depthCm: 75,
    heightCm: 55,
    color: '#F4F4F1',
    subColor: '#C9CED1',
    shapeType: 'fixture-bathtub',
  },
  {
    id: 'washing-machine',
    name: 'Washing Machine',
    category: 'bathroom',
    widthCm: 60,
    depthCm: 60,
    heightCm: 85,
    color: '#E6E8EA',
    subColor: '#5B6670',
    shapeType: 'fixture-washer',
  },
  {
    id: 'shoe-rack',
    name: 'Shoe Rack',
    category: 'decor',
    widthCm: 80,
    depthCm: 30,
    heightCm: 90,
    color: '#7A5A3C',
    shapeType: 'chest-drawers',
  },

  // ==========================================
  // LIVING ROOM (more)
  // ==========================================
  {
    id: 'sofa-l-shaped',
    name: 'L-Shaped Corner Sofa',
    category: 'living',
    widthCm: 270,
    depthCm: 170,
    heightCm: 84,
    color: '#5E6B73',
    cushionColor: '#6F7C84',
    legColor: '#1C1A17',
    shapeType: 'sofa-l',
  },
  {
    id: 'recliner-chair',
    name: 'Recliner Armchair',
    category: 'living',
    widthCm: 90,
    depthCm: 95,
    heightCm: 100,
    color: '#6B4A3A',
    cushionColor: '#7C5A48',
    legColor: '#1C1A17',
    shapeType: 'armchair',
  },
  {
    id: 'bean-bag',
    name: 'Bean Bag',
    category: 'living',
    widthCm: 90,
    depthCm: 90,
    heightCm: 65,
    color: '#C0642F',
    cushionColor: '#D07A44',
    shapeType: 'bean-bag',
  },
  {
    id: 'tv-unit-low',
    name: 'Low TV Unit',
    category: 'living',
    widthCm: 180,
    depthCm: 40,
    heightCm: 45,
    color: '#B58B5C',
    subColor: '#8F6A42',
    legColor: '#1C1A17',
    shapeType: 'credenza',
  },
  {
    id: 'console-table',
    name: 'Console Table',
    category: 'living',
    widthCm: 120,
    depthCm: 32,
    heightCm: 80,
    color: '#3F2E22',
    subColor: '#2B1F16',
    handleColor: '#C49746',
    legColor: '#C49746',
    shapeType: 'sideboard',
  },
  {
    id: 'hall-bench',
    name: 'Upholstered Hall Bench',
    category: 'living',
    widthCm: 110,
    depthCm: 40,
    heightCm: 45,
    color: '#7B8C84',
    cushionColor: '#8A9B93',
    legColor: '#2B1C12',
    shapeType: 'ottoman',
  },
  {
    id: 'coffee-table-round',
    name: 'Round Coffee Table',
    category: 'living',
    widthCm: 80,
    depthCm: 80,
    heightCm: 42,
    color: '#D7C7AA',
    subColor: '#B8A684',
    legColor: '#2B2B2B',
    shapeType: 'side-table',
  },

  // ==========================================
  // BEDROOM (more)
  // ==========================================
  {
    id: 'bed-double',
    name: 'Double Bed',
    category: 'bedroom',
    widthCm: 150,
    depthCm: 200,
    heightCm: 95,
    color: '#7A5A3C',
    headboardColor: '#4F3A2A',
    fabricColor: '#F4EFE6',
    accentColor: '#A8B5A0',
    shapeType: 'bed',
  },
  {
    id: 'bed-storage-single',
    name: 'Single Bed with Storage',
    category: 'bedroom',
    widthCm: 100,
    depthCm: 200,
    heightCm: 90,
    color: '#B89A74',
    headboardColor: '#8A6F4E',
    fabricColor: '#F4EFE6',
    accentColor: '#9DB7C9',
    shapeType: 'bed',
  },
  {
    id: 'dressing-table',
    name: 'Dressing Table with Mirror',
    category: 'bedroom',
    widthCm: 100,
    depthCm: 45,
    heightCm: 140,
    color: '#E5D9C8',
    subColor: '#CDBDA6',
    handleColor: '#C49746',
    legColor: '#8A6F4E',
    shapeType: 'dressing-table',
  },
  {
    id: 'wardrobe-wall',
    name: 'Wall-to-Wall Wardrobe',
    category: 'bedroom',
    widthCm: 300,
    depthCm: 60,
    heightCm: 240,
    color: '#D9D2C5',
    subColor: '#B8AE9C',
    handleColor: '#7A736A',
    shapeType: 'wardrobe',
  },
  {
    id: 'baby-crib',
    name: 'Baby Crib',
    category: 'bedroom',
    widthCm: 125,
    depthCm: 70,
    heightCm: 95,
    color: '#E9DFCF',
    fabricColor: '#FFFFFF',
    accentColor: '#9DB7C9',
    shapeType: 'crib',
  },
  {
    id: 'bedside-round',
    name: 'Round Bedside Table',
    category: 'bedroom',
    widthCm: 40,
    depthCm: 40,
    heightCm: 55,
    color: '#8A6F4E',
    subColor: '#6B5134',
    legColor: '#2B1C12',
    shapeType: 'side-table',
  },
  {
    id: 'blanket-trunk',
    name: 'Blanket Trunk',
    category: 'bedroom',
    widthCm: 100,
    depthCm: 50,
    heightCm: 50,
    color: '#6B4A32',
    subColor: '#7D5A40',
    accentColor: '#C49746',
    shapeType: 'trunk',
  },

  // ==========================================
  // DINING & OFFICE (more)
  // ==========================================
  {
    id: 'dining-table-4',
    name: '4-Seat Dining Table',
    category: 'dining_office',
    widthCm: 120,
    depthCm: 75,
    heightCm: 75,
    color: '#B59671',
    subColor: '#9C7E5A',
    legColor: '#1E1D1B',
    shapeType: 'table',
  },
  {
    id: 'dining-bench',
    name: 'Dining Bench',
    category: 'dining_office',
    widthCm: 120,
    depthCm: 35,
    heightCm: 45,
    color: '#9B7B55',
    subColor: '#6B5134',
    legColor: '#2B1C12',
    shapeType: 'bench',
  },
  {
    id: 'bar-cabinet',
    name: 'Bar Cabinet',
    category: 'dining_office',
    widthCm: 100,
    depthCm: 45,
    heightCm: 110,
    color: '#2F3A36',
    subColor: '#1F2724',
    handleColor: '#C49746',
    legColor: '#C49746',
    shapeType: 'sideboard',
  },
  {
    id: 'desk-l-shaped',
    name: 'L-Shaped Desk',
    category: 'dining_office',
    widthCm: 160,
    depthCm: 140,
    heightCm: 75,
    color: '#8A6F4E',
    subColor: '#2B2D30',
    legColor: '#2B2B2B',
    shapeType: 'desk-l',
  },
  {
    id: 'standing-desk',
    name: 'Standing Desk',
    category: 'dining_office',
    widthCm: 140,
    depthCm: 70,
    heightCm: 105,
    color: '#C9B08A',
    subColor: '#2B2D30',
    accentColor: '#7FD1B9',
    legColor: '#2B2B2B',
    shapeType: 'standing-desk',
  },
  {
    id: 'filing-cabinet',
    name: 'Filing Cabinet',
    category: 'dining_office',
    widthCm: 45,
    depthCm: 62,
    heightCm: 72,
    color: '#7C858C',
    legColor: '#3A3F44',
    handleColor: '#B7BCC0',
    shapeType: 'chest-drawers',
  },
  {
    id: 'office-sofa',
    name: 'Office Sofa',
    category: 'dining_office',
    widthCm: 190,
    depthCm: 85,
    heightCm: 78,
    color: '#3C4650',
    cushionColor: '#4A5560',
    legColor: '#1C1A17',
    shapeType: 'sofa',
  },
  {
    id: 'reception-counter',
    name: 'Reception Counter',
    category: 'dining_office',
    widthCm: 200,
    depthCm: 70,
    heightCm: 110,
    color: '#2F3B45',
    subColor: '#1C1F22',
    accentColor: '#C9B08A',
    shapeType: 'reception-counter',
  },
  {
    id: 'conference-table',
    name: 'Conference Table',
    category: 'dining_office',
    widthCm: 240,
    depthCm: 100,
    heightCm: 75,
    color: '#5A4330',
    subColor: '#3E2D1F',
    legColor: '#1E1D1B',
    shapeType: 'table',
  },

  // ==========================================
  // KITCHEN (more, floor-standing)
  // ==========================================
  {
    id: 'sink-unit',
    name: 'Sink Unit',
    category: 'kitchen',
    widthCm: 120,
    depthCm: 60,
    heightCm: 90,
    color: '#D9D5CC',
    subColor: '#C6CCD2',
    accentColor: '#44505A',
    handleColor: '#C4A869',
    shapeType: 'sink-unit',
  },
  {
    id: 'dishwasher',
    name: 'Dishwasher',
    category: 'kitchen',
    widthCm: 60,
    depthCm: 60,
    heightCm: 85,
    color: '#D6D9DC',
    subColor: '#2B2D30',
    accentColor: '#8E98A0',
    shapeType: 'appliance',
  },
  {
    id: 'oven-unit',
    name: 'Floor Oven Unit',
    category: 'kitchen',
    widthCm: 60,
    depthCm: 60,
    heightCm: 90,
    color: '#2A2D30',
    subColor: '#101214',
    accentColor: '#B7BCC0',
    shapeType: 'appliance',
  },
  {
    id: 'microwave-stand',
    name: 'Microwave Stand',
    category: 'kitchen',
    widthCm: 80,
    depthCm: 45,
    heightCm: 90,
    color: '#6B5134',
    subColor: '#4A3420',
    handleColor: '#C49746',
    legColor: '#2B2B2B',
    shapeType: 'sideboard',
  },
  {
    id: 'kitchen-tall-cabinet',
    name: 'Tall Kitchen Cabinet',
    category: 'kitchen',
    widthCm: 60,
    depthCm: 60,
    heightCm: 210,
    color: '#E8E1D5',
    subColor: '#C9C0B0',
    handleColor: '#7A736A',
    shapeType: 'pantry-cabinet',
  },

  // ==========================================
  // BATHROOM & UTILITY (more)
  // ==========================================
  {
    id: 'bath-vanity',
    name: 'Vanity with Basin',
    category: 'bathroom',
    widthCm: 80,
    depthCm: 48,
    heightCm: 85,
    color: '#8A6F4E',
    subColor: '#E8E4DC',
    handleColor: '#C49746',
    legColor: '#2B2B2B',
    shapeType: 'vanity',
  },
  {
    id: 'mirror-cabinet',
    name: 'Tall Mirror Cabinet',
    category: 'bathroom',
    widthCm: 50,
    depthCm: 18,
    heightCm: 150,
    color: '#E8E4DC',
    mirrorColor: '#B0D3E2',
    shapeType: 'wall-mirror',
  },
  {
    id: 'laundry-basket',
    name: 'Laundry Basket',
    category: 'bathroom',
    widthCm: 40,
    depthCm: 40,
    heightCm: 60,
    color: '#B89A6E',
    accentColor: '#8A6F4E',
    shapeType: 'basket',
  },
  {
    id: 'towel-cabinet',
    name: 'Towel Cabinet',
    category: 'bathroom',
    widthCm: 40,
    depthCm: 30,
    heightCm: 160,
    color: '#E8E4DC',
    subColor: '#C9C3B6',
    handleColor: '#B7BCC0',
    shapeType: 'pantry-cabinet',
  },
  {
    id: 'water-heater',
    name: 'Water Heater on Stand',
    category: 'bathroom',
    widthCm: 45,
    depthCm: 45,
    heightCm: 120,
    color: '#EDEFF0',
    subColor: '#B7BCC0',
    accentColor: '#C0392B',
    legColor: '#4A5057',
    shapeType: 'tank',
  },
  {
    id: 'squat-toilet',
    name: 'Squat Toilet (Pan)',
    category: 'bathroom',
    widthCm: 50,
    depthCm: 70,
    heightCm: 30,
    color: '#F4F4F1',
    subColor: '#D9D9D4',
    shapeType: 'squat-toilet',
  },

  // ==========================================
  // DECOR & ACCENTS (more)
  // ==========================================
  {
    id: 'floor-lamp-tripod',
    name: 'Tripod Floor Lamp',
    category: 'decor',
    widthCm: 50,
    depthCm: 50,
    heightCm: 150,
    color: '#3A2A1C',
    subColor: '#F2E8D5',
    shapeType: 'lamp-tripod',
  },
  {
    id: 'floor-lamp-torchiere',
    name: 'Torchiere Floor Lamp',
    category: 'decor',
    widthCm: 35,
    depthCm: 35,
    heightCm: 175,
    color: '#1C1A17',
    subColor: '#FAF6EE',
    shapeType: 'lamp-torchiere',
  },
  {
    id: 'planter-small',
    name: 'Small Planter',
    category: 'decor',
    widthCm: 30,
    depthCm: 30,
    heightCm: 60,
    color: '#4B6B52',
    subColor: '#C8B8A0',
    shapeType: 'planter',
  },
  {
    id: 'planter-medium',
    name: 'Medium Planter',
    category: 'decor',
    widthCm: 45,
    depthCm: 45,
    heightCm: 100,
    color: '#385343',
    subColor: '#B8644A',
    shapeType: 'planter',
  },
  {
    id: 'planter-large',
    name: 'Large Planter',
    category: 'decor',
    widthCm: 70,
    depthCm: 70,
    heightCm: 160,
    color: '#2F4A38',
    subColor: '#D4CABB',
    shapeType: 'planter',
  },
  {
    id: 'rug-round',
    name: 'Round Rug',
    category: 'decor',
    widthCm: 160,
    depthCm: 160,
    heightCm: 1.2,
    color: '#2E4A5C',
    subColor: '#D4A359',
    accentColor: '#8B1E1E',
    shapeType: 'rug-round',
  },
  {
    id: 'rug-small',
    name: 'Small Accent Rug',
    category: 'decor',
    widthCm: 120,
    depthCm: 180,
    heightCm: 1.2,
    color: '#6E2B2B',
    subColor: '#D4A359',
    accentColor: '#1B2A4A',
    shapeType: 'rug',
  },
  {
    id: 'room-divider-screen',
    name: 'Room Divider Screen',
    category: 'decor',
    widthCm: 150,
    depthCm: 30,
    heightCm: 170,
    color: '#6B4A32',
    accentColor: '#C9A66B',
    shapeType: 'screen',
  },
  {
    id: 'cheval-mirror',
    name: 'Cheval Mirror',
    category: 'decor',
    widthCm: 55,
    depthCm: 40,
    heightCm: 165,
    color: '#6B4A32',
    mirrorColor: '#B0D3E2',
    shapeType: 'wall-mirror',
  },

  // ==========================================
  // NEPALI HOUSEHOLD (more)
  // ==========================================
  {
    id: 'nepali-low-dining',
    name: 'Low Dining Table',
    nepaliName: 'होचो खाने टेबल',
    category: 'nepali',
    widthCm: 120,
    depthCm: 70,
    heightCm: 42,
    color: '#6B3E26',
    legColor: '#3A2016',
    shapeType: 'coffee-table',
  },
  {
    id: 'nepali-doko',
    name: 'Bamboo Doko Basket',
    nepaliName: 'डोको',
    category: 'nepali',
    widthCm: 45,
    depthCm: 45,
    heightCm: 55,
    color: '#C9A66B',
    accentColor: '#8A6A3B',
    shapeType: 'basket',
  },
  {
    id: 'nepali-pidha',
    name: 'Wooden Pidha Bench',
    nepaliName: 'पिंढा',
    category: 'nepali',
    widthCm: 120,
    depthCm: 35,
    heightCm: 40,
    color: '#8B5A38',
    subColor: '#5C3524',
    legColor: '#3A2016',
    shapeType: 'bench',
  },
  {
    id: 'nepali-pooja-table',
    name: 'Pooja Table',
    nepaliName: 'पूजा टेबल',
    category: 'nepali',
    widthCm: 50,
    depthCm: 40,
    heightCm: 75,
    color: '#542E1B',
    accentColor: '#C49746',
    shapeType: 'nepali-chowki',
  },
];

// ==========================================
// Runtime registry for user-created furniture (photo models)
// ==========================================
const customFurniture = new Map();

export function registerCustomFurniture(def) {
  if (!def || !def.id) return;
  customFurniture.set(def.id, { category: 'custom', shapeType: 'custom-mesh', ...def });
}

export function unregisterCustomFurniture(id) {
  customFurniture.delete(id);
}

export function listCustomFurniture() {
  return Array.from(customFurniture.values());
}

export function getFurnitureType(id) {
  return FURNITURE_CATALOG.find((item) => item.id === id) || customFurniture.get(id) || null;
}

/** Fields a user may override per placed item (size and finish). */
export const OVERRIDABLE_FIELDS = [
  'widthCm',
  'depthCm',
  'heightCm',
  'color',
  'subColor',
  'accentColor',
];

/**
 * Resolves the effective definition of a placed item:
 * catalog (or custom) type merged with its per-item overrides.
 */
export function resolveItemDef(item) {
  if (!item) return null;
  const base = getFurnitureType(item.furnitureTypeId);
  if (!base) return null;
  const o = item.overrides;
  if (!o) return base;
  const merged = { ...base };
  for (const key of OVERRIDABLE_FIELDS) {
    if (o[key] !== undefined && o[key] !== null && o[key] !== '') merged[key] = o[key];
  }
  return merged;
}
