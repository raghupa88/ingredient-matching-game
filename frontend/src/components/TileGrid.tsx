import { useState, useEffect } from 'react';
import { Tile } from '../types/game';

interface Props {
  tiles: Tile[];
  onSubmit: (selected: string[]) => void;
  disabled: boolean;
}

export function TileGrid({ tiles, onSubmit, disabled }: Props) {
  const [flipped, setFlipped] = useState<Set<number>>(new Set());
  const [selected, setSelected] = useState<Set<number>>(new Set());

  useEffect(() => {
    setFlipped(new Set());
    setSelected(new Set());
  }, [tiles]);

  function handleTile(i: number) {
    if (disabled) return;
    setFlipped(prev => { const n = new Set(prev); n.add(i); return n; });
    setSelected(prev => {
      const n = new Set(prev);
      if (n.has(i)) n.delete(i); else n.add(i);
      return n;
    });
  }

  function handleSubmit() {
    const names = Array.from(selected).map(i => tiles[i].name);
    onSubmit(names);
  }

  return (
    <div className="tile-grid-wrapper">
      <div className="tile-grid">
        {tiles.map((tile, i) => (
          <button
            key={i}
            className={`tile${flipped.has(i) ? ' flipped' : ''}${selected.has(i) ? ' selected' : ''}`}
            onClick={() => handleTile(i)}
            disabled={disabled}
          >
            <span className="tile-front">?</span>
            <span className="tile-back">{tile.name}</span>
          </button>
        ))}
      </div>
      <button
        className="btn-primary submit-btn"
        disabled={selected.size === 0 || disabled}
        onClick={handleSubmit}
      >
        Submit Selection <span className="tamil">சமர்ப்பி</span>
      </button>
    </div>
  );
}
