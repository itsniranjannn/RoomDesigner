import React, { useState } from 'react';
import { Camera, PanelLeftClose, SearchX } from 'lucide-react';
import {
  FURNITURE_CATALOG,
  FURNITURE_CATEGORIES,
  listCustomFurniture,
} from '../../data/furnitureCatalog.js';
import { useRoomStore } from '../../store/roomStore.js';
import { Button } from '../common/Button.jsx';
import { ConfirmDialog } from '../common/ConfirmDialog.jsx';
import { SearchField } from '../common/Field.jsx';
import { IconButton } from '../common/Section.jsx';
import { ChipRow } from './ChipRow.jsx';
import { CatalogItem } from './CatalogItem.jsx';
import styles from './FurnitureCatalog.module.css';

// Short names keep all the category chips on one scrolling row
const SHORT_NAMES = {
  dining_office: 'Dining & office',
  decor: 'Decor',
  bathroom: 'Bathroom',
  nepali: 'Nepali',
  living: 'Living',
  custom: 'My furniture',
};

const matches = (item, query, categoryName) => {
  if (!query) return true;
  const haystack = `${item.name} ${item.nepaliName || ''} ${categoryName}`.toLowerCase();
  return query.split(/\s+/).every((word) => haystack.includes(word));
};

// "My furniture" comes first so the user's own pieces are always easy to reach
const ORDERED_CATEGORIES = [
  ...FURNITURE_CATEGORIES.filter((cat) => cat.id === 'custom'),
  ...FURNITURE_CATEGORIES.filter((cat) => cat.id !== 'custom'),
];

export function FurnitureCatalog({ onClose, onPlaced }) {
  const addFurniture = useRoomStore((state) => state.addFurniture);
  const openModal = useRoomStore((state) => state.openModal);
  const removeCustomFurniture = useRoomStore((state) => state.removeCustomFurniture);
  useRoomStore((state) => state.customVersion); // re-render when custom furniture changes
  const customItems = listCustomFurniture();

  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');
  const [pendingDelete, setPendingDelete] = useState(null);

  const needle = query.trim().toLowerCase();

  const groups = [];
  for (const cat of ORDERED_CATEGORIES) {
    if (category !== 'all' && category !== cat.id) continue;
    const source =
      cat.id === 'custom'
        ? customItems
        : FURNITURE_CATALOG.filter((item) => item.category === cat.id);
    const items = source.filter((item) => matches(item, needle, cat.name));
    // An empty "My furniture" group stays visible so the photo entry is easy to find
    if (items.length > 0 || (cat.id === 'custom' && !needle)) groups.push({ ...cat, items });
  }

  const shownCount = groups.reduce((n, g) => n + g.items.length, 0);
  const totalCount = FURNITURE_CATALOG.length + customItems.length;

  const place = (furnitureTypeId) => {
    addFurniture(furnitureTypeId);
    onPlaced?.();
  };

  const showHeadings = groups.length > 1;

  return (
    <aside className={styles.catalog} aria-label="Furniture">
      <header className={styles.header}>
        <div className={styles.heading}>
          <h2 className={styles.title}>Furniture</h2>
          <span className={styles.count}>
            {needle || category !== 'all'
              ? `${shownCount} of ${totalCount} pieces`
              : `${totalCount} pieces`}
          </span>
        </div>
        <IconButton label="Hide furniture list" onClick={onClose}>
          <PanelLeftClose size={18} />
        </IconButton>
      </header>

      <div className={styles.controls}>
        <SearchField value={query} onChange={setQuery} placeholder="Search furniture" />
        <ChipRow
          label="Category"
          value={category}
          onChange={setCategory}
          chips={[{ id: 'all', name: 'All' }, ...ORDERED_CATEGORIES].map((cat) => ({
            id: cat.id,
            label: SHORT_NAMES[cat.id] || cat.name,
          }))}
        />
      </div>

      <div className={styles.scroll}>
        <p className={styles.srOnly} aria-live="polite">
          {shownCount} pieces shown
        </p>

        {groups.map((group) => (
          <section key={group.id} className={styles.group} aria-label={group.name}>
            {showHeadings && (
              <h3 className={styles.groupTitle}>
                {group.name}
                <span className={styles.groupCount}>{group.items.length}</span>
              </h3>
            )}

            {group.id === 'custom' && (
              <button type="button" className={styles.photoCard} onClick={() => openModal('photo')}>
                <Camera size={18} aria-hidden="true" />
                <span className={styles.photoText}>
                  <strong>Create from photos</strong>
                  <span>Turn photos of your own furniture into a 3D piece.</span>
                </span>
              </button>
            )}

            {group.items.length > 0 && (
              <div className={styles.grid}>
                {group.items.map((item) => (
                  <CatalogItem
                    key={item.id}
                    item={item}
                    onSelect={place}
                    onDropped={onPlaced}
                    onDelete={group.id === 'custom' ? () => setPendingDelete(item) : undefined}
                  />
                ))}
              </div>
            )}
          </section>
        ))}

        {shownCount === 0 && needle && (
          <div className={styles.empty}>
            <SearchX size={28} aria-hidden="true" />
            <p className={styles.emptyTitle}>No pieces match &ldquo;{query.trim()}&rdquo;</p>
            <p className={styles.emptyText}>
              Check the spelling or try a shorter word, like &ldquo;chair&rdquo;.
            </p>
            <Button
              size="small"
              onClick={() => {
                setQuery('');
                setCategory('all');
              }}
            >
              Clear search
            </Button>
          </div>
        )}
      </div>

      {pendingDelete && (
        <ConfirmDialog
          title={`Delete "${pendingDelete.name}"?`}
          message="It is removed from My furniture, and any copies placed in your rooms disappear too."
          confirmLabel="Delete piece"
          onClose={() => setPendingDelete(null)}
          onConfirm={() => {
            removeCustomFurniture(pendingDelete.id);
            setPendingDelete(null);
          }}
        />
      )}
    </aside>
  );
}
