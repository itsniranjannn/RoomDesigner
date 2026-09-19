import React, { useState } from 'react';
import { FURNITURE_CATALOG, FURNITURE_CATEGORIES } from '../../data/furnitureCatalog.js';
import { CatalogItem } from './CatalogItem.jsx';
import { useRoomStore } from '../../store/roomStore.js';
import { ChevronDown } from 'lucide-react';
import styles from './FurnitureCatalog.module.css';

export function FurnitureCatalog() {
  const addFurniture = useRoomStore((state) => state.addFurniture);

  // Default: first category (Living Room) open, others expandable
  const [openCategories, setOpenCategories] = useState({
    living: true,
    bedroom: false,
    dining_office: false,
    kitchen: false,
    decor: false,
  });

  const allOpen = Object.values(openCategories).every(Boolean);

  const toggleCategory = (categoryId) => {
    setOpenCategories((prev) => ({
      ...prev,
      [categoryId]: !prev[categoryId],
    }));
  };

  const toggleAll = () => {
    const nextState = !allOpen;
    const updated = {};
    FURNITURE_CATEGORIES.forEach((cat) => {
      updated[cat.id] = nextState;
    });
    setOpenCategories(updated);
  };

  const handleSelectItem = (furnitureTypeId) => {
    addFurniture(furnitureTypeId);
  };

  return (
    <aside className={styles.catalogRail} aria-label="Furniture catalog">
      <div className={styles.catalogHeader}>
        <div>
          <h2 className={styles.title}>Catalog</h2>
          <span className={styles.itemCount}>{FURNITURE_CATALOG.length} pieces</span>
        </div>
        <button
          type="button"
          className={styles.toggleAllBtn}
          onClick={toggleAll}
          title={allOpen ? 'Collapse all categories' : 'Expand all categories'}
        >
          {allOpen ? 'Collapse all' : 'Expand all'}
        </button>
      </div>

      <div className={styles.scrollList}>
        <p className={styles.hintText}>
          Click or drag a piece directly into the room canvas.
        </p>
        {FURNITURE_CATEGORIES.map((cat) => {
          const items = FURNITURE_CATALOG.filter((item) => item.category === cat.id);
          if (items.length === 0) return null;
          const isOpen = !!openCategories[cat.id];

          return (
            <section key={cat.id} className={styles.categoryGroup}>
              <button
                type="button"
                className={styles.categoryHeader}
                onClick={() => toggleCategory(cat.id)}
                aria-expanded={isOpen}
              >
                <div className={styles.categoryTitleWrap}>
                  <span className={styles.categoryTitle}>{cat.name}</span>
                  <span className={styles.categoryBadge}>{items.length}</span>
                </div>
                <span className={`${styles.chevron} ${isOpen ? styles.chevronOpen : ''}`}>
                  <ChevronDown size={14} />
                </span>
              </button>

              {isOpen && (
                <div className={styles.cardGrid}>
                  {items.map((item) => (
                    <CatalogItem
                      key={item.id}
                      item={item}
                      onSelect={handleSelectItem}
                    />
                  ))}
                </div>
              )}
            </section>
          );
        })}
      </div>
    </aside>
  );
}
