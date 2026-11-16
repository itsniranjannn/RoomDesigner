import React, { useState } from 'react';
import { Camera, ChevronDown, PanelLeftClose, SearchX } from 'lucide-react';
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
import { useMediaQuery } from '../layout/hooks.js';
import { ChipRow } from './ChipRow.jsx';
import { CatalogItem } from './CatalogItem.jsx';
import styles from './FurnitureCatalog.module.css';

// Short names keep all the category chips on one scrolling row. A category with no short
// name here uses its full name, so the chip and the group heading cannot drift apart.
const SHORT_NAMES = {
  dining_office: 'Dining & office',
  decor: 'Decor',
  bathroom: 'Bathroom',
  nepali: 'Nepali',
  living: 'Living',
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

  /*
   * Landscape phone: the drawer is about 280px tall and the header, the search box, the
   * category chips and the photo card of an empty "My furniture" came to more than that, so
   * not one piece was in sight until you scrolled. There the chips fold behind a button that
   * names the category in use, the photo card moves below the first row of pieces, and an
   * empty group steps aside for them. At normal heights nothing about the panel changes.
   */
  const shortPanel = useMediaQuery('(max-height: 520px)');
  const [chipsOpen, setChipsOpen] = useState(false);
  const foldPhoto = shortPanel && groups.some((g) => g.items.length > 0);
  const shownGroups = foldPhoto ? groups.filter((g) => g.items.length > 0) : groups;
  const categoryLabel =
    category === 'all'
      ? 'All'
      : SHORT_NAMES[category] ||
        FURNITURE_CATEGORIES.find((cat) => cat.id === category)?.name ||
        'All';

  const photoCard = (
    <button type="button" className={styles.photoCard} onClick={() => openModal('photo')}>
      <Camera size={18} aria-hidden="true" />
      <span className={styles.photoText}>
        <strong>Create from photos</strong>
        <span className={styles.photoHint}>Turn photos of your own furniture into a 3D piece.</span>
      </span>
    </button>
  );

  const showHeadings = shownGroups.length > 1;

  return (
    <aside className={styles.catalog} aria-label="Furniture">
      {/*
       * Every catalog card is a tab stop, so the plan and its toolbar are well over a
       * hundred Tab presses away. This is the first thing in the panel, and it is visible
       * as soon as it takes focus.
       */}
      <a
        href="#room-plan"
        className="rd-skip-link"
        onClick={(e) => {
          e.preventDefault();
          document.getElementById('room-plan')?.focus();
        }}
      >
        Skip the furniture list
      </a>
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
        <div className={styles.searchRow}>
          <SearchField
            value={query}
            onChange={setQuery}
            /* The box is narrower beside the category button; the name it answers to is not */
            placeholder={shortPanel ? 'Search' : 'Search furniture'}
            ariaLabel="Search furniture"
          />
          {shortPanel && (
            <button
              type="button"
              className={styles.categoryToggle}
              aria-expanded={chipsOpen}
              aria-label={`Category: ${categoryLabel}. Choose a category`}
              onClick={() => setChipsOpen((open) => !open)}
            >
              <span className={styles.categoryName}>{categoryLabel}</span>
              <ChevronDown
                size={14}
                aria-hidden="true"
                className={chipsOpen ? styles.chevronUp : undefined}
              />
            </button>
          )}
        </div>
        {(!shortPanel || chipsOpen) && (
          <ChipRow
            label="Category"
            value={category}
            onChange={(id) => {
              setCategory(id);
              setChipsOpen(false);
            }}
            chips={[{ id: 'all', name: 'All' }, ...ORDERED_CATEGORIES].map((cat) => ({
              id: cat.id,
              label: SHORT_NAMES[cat.id] || cat.name,
            }))}
          />
        )}
      </div>

      <div className={styles.scroll}>
        <p className={styles.srOnly} aria-live="polite">
          {shownCount} pieces shown
        </p>

        {shownGroups.map((group, index) => (
          <section key={group.id} className={styles.group} aria-label={group.name}>
            {showHeadings && (
              <h3 className={styles.groupTitle}>
                {group.name}
                <span className={styles.groupCount}>{group.items.length}</span>
              </h3>
            )}

            {group.id === 'custom' && !foldPhoto && photoCard}

            {group.items.length > 0 && (
              <div className={styles.grid}>
                {group.items.map((item, position) => (
                  <React.Fragment key={item.id}>
                    <CatalogItem
                      item={item}
                      onSelect={place}
                      onDropped={onPlaced}
                      onDelete={group.id === 'custom' ? () => setPendingDelete(item) : undefined}
                    />
                    {/* The grid is two columns wide, so this lands under the first row */}
                    {foldPhoto && index === 0 && position === 1 && (
                      <div className={styles.photoBelow}>{photoCard}</div>
                    )}
                  </React.Fragment>
                ))}
                {foldPhoto && index === 0 && group.items.length === 1 && (
                  <div className={styles.photoBelow}>{photoCard}</div>
                )}
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
