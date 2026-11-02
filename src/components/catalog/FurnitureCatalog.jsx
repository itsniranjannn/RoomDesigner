import React, { useState } from 'react';
import { FURNITURE_CATALOG, FURNITURE_CATEGORIES, listCustomFurniture } from '../../data/furnitureCatalog.js';
import { CatalogItem } from './CatalogItem.jsx';
import { useRoomStore } from '../../store/roomStore.js';
import { ChevronDown, Camera, Trash2 } from 'lucide-react';
import styles from './FurnitureCatalog.module.css';

export function FurnitureCatalog() {
  const addFurniture = useRoomStore((state) => state.addFurniture);
  const openModal = useRoomStore((state) => state.openModal);
  const removeCustomFurniture = useRoomStore((state) => state.removeCustomFurniture);
  useRoomStore((state) => state.customVersion); // re-render when custom furniture changes
  const customItems = listCustomFurniture();

  // Default: first category (Living Room) and Nepali Household open
  const [openCategories, setOpenCategories] = useState({
    living: true,
    bedroom: false,
    nepali: true,
    dining_office: false,
    kitchen: false,
    decor: false,
    bathroom: false,
    custom: true,
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
        <div className={styles.catalogHeaderTop}>
          <div className={styles.catalogFolioTag}>FOLIO // SPECIMENS</div>
          <button
            type="button"
            className={styles.toggleAllBtn}
            onClick={toggleAll}
            title={allOpen ? 'Collapse all categories' : 'Expand all categories'}
          >
            {allOpen ? 'Collapse all' : 'Expand all'}
          </button>
        </div>
        <div className={styles.catalogHeaderTitleRow}>
          <h2 className={styles.title}>Material Library</h2>
          <span className={styles.itemCount}>{FURNITURE_CATALOG.length + customItems.length} SPECIFICATIONS</span>
        </div>
      </div>

      <div className={styles.scrollList}>
        <p className={styles.hintText}>
          Click or drag a piece directly into the room canvas.
        </p>
        {FURNITURE_CATEGORIES.map((cat) => {
          const items = cat.id === 'custom'
            ? customItems
            : FURNITURE_CATALOG.filter((item) => item.category === cat.id);
          if (items.length === 0 && cat.id !== 'custom') return null;
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
                    <div key={item.id} style={{ position: 'relative' }}>
                      <CatalogItem item={item} onSelect={handleSelectItem} />
                      {cat.id === 'custom' && (
                        <button
                          type="button"
                          aria-label={`Delete ${item.name} from My Furniture`}
                          title="Delete from My Furniture"
                          onClick={() => {
                            if (window.confirm(`Delete "${item.name}" from My Furniture? Placed copies will disappear from rooms.`)) {
                              removeCustomFurniture(item.id);
                            }
                          }}
                          style={{
                            position: 'absolute', top: 4, right: 4, padding: 4, display: 'flex',
                            background: 'rgba(246,242,234,0.92)', border: '1px solid var(--color-taupe)',
                            borderRadius: 4, cursor: 'pointer', color: 'var(--color-maroon)',
                          }}
                        >
                          <Trash2 size={11} />
                        </button>
                      )}
                    </div>
                  ))}
                  {cat.id === 'custom' && (
                    <button
                      type="button"
                      onClick={() => openModal('photo')}
                      style={{
                        gridColumn: '1 / -1', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        gap: 8, padding: '12px 10px', cursor: 'pointer', fontFamily: 'var(--font-sans)',
                        fontSize: 'var(--text-sm)', color: 'var(--color-indigo)', background: 'var(--color-linen-surface)',
                        border: '1px dashed var(--color-indigo)', borderRadius: 'var(--radius-md)',
                      }}
                    >
                      <Camera size={15} /> Create from photos
                    </button>
                  )}
                </div>
              )}
            </section>
          );
        })}
      </div>
    </aside>
  );
}
