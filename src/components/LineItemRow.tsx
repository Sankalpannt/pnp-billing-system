import React, { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { LineItem, CatalogItem } from '../types/invoice';
import { formatNPR } from '../utils/formatters';

interface LineItemRowProps {
  item: LineItem;
  catalog: CatalogItem[];
  showDiscount?: boolean;
  onUpdate: (id: string, field: keyof LineItem, value: any) => void;
  onRemove: (id: string) => void;
}

export const LineItemRow: React.FC<LineItemRowProps> = ({
  item,
  catalog,
  showDiscount = true,
  onUpdate,
  onRemove
}) => {
  const [showCatalogMenu, setShowCatalogMenu] = useState(false);

  const filteredCatalog = catalog.filter(cat => 
    cat.description.toLowerCase().includes(item.description.toLowerCase())
  );

  const handleSelectCatalog = (catItem: CatalogItem) => {
    onUpdate(item.id, 'description', catItem.description);
    onUpdate(item.id, 'unit', catItem.unit);
    onUpdate(item.id, 'listPrice', catItem.price);
    setShowCatalogMenu(false);
  };

  return (
    <tr className="border-b border-slate-800 hover:bg-slate-800/40 transition-colors group">
      {/* S.N. */}
      <td className="py-3 px-3 text-center text-xs font-semibold font-mono text-slate-400">
        {item.sn}
      </td>

      {/* Description / Service Particulars */}
      <td className="py-3 px-3 relative min-w-[240px]">
        <div className="relative">
          <input
            type="text"
            value={item.description}
            onChange={(e) => {
              onUpdate(item.id, 'description', e.target.value);
              setShowCatalogMenu(true);
            }}
            onFocus={() => setShowCatalogMenu(true)}
            onBlur={() => setTimeout(() => setShowCatalogMenu(false), 200)}
            placeholder="e.g. Wireless Mouse, HDMI Cable, 12V Adapter, Photo Print..."
            className="w-full bg-slate-900/80 border border-slate-700 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-500 transition-all font-sans"
          />

          {/* Quick Catalog Suggestions Dropdown */}
          {showCatalogMenu && filteredCatalog.length > 0 && (
            <div className="absolute left-0 top-full mt-1 w-full max-h-48 overflow-y-auto bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-30 divide-y divide-slate-700/50">
              <div className="px-2 py-1 bg-slate-900/80 text-[10px] uppercase font-bold text-sky-400 tracking-wider">
                Quick Catalog Presets
              </div>
              {filteredCatalog.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onMouseDown={() => handleSelectCatalog(cat)}
                  className="w-full text-left px-3 py-1.5 hover:bg-sky-600/30 flex items-center justify-between transition-colors text-xs"
                >
                  <span className="text-slate-200 font-medium">{cat.description}</span>
                  <span className="text-sky-400 font-mono text-[11px]">
                    {formatNPR(cat.price)} / {cat.unit}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </td>

      {/* Qty */}
      <td className="py-3 px-2 w-20">
        <input
          type="number"
          min="0.01"
          step="any"
          value={item.qty}
          onChange={(e) => onUpdate(item.id, 'qty', parseFloat(e.target.value) || 0)}
          className="w-full bg-slate-900/80 border border-slate-700 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 rounded-lg px-2 py-1.5 text-xs text-center font-mono text-white"
        />
      </td>

      {/* Unit */}
      <td className="py-3 px-2 w-24">
        <select
          value={item.unit}
          onChange={(e) => onUpdate(item.id, 'unit', e.target.value)}
          className="w-full bg-slate-900/80 border border-slate-700 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 rounded-lg px-2 py-1.5 text-xs text-slate-300 font-medium"
        >
          <option value="Pcs">Pcs</option>
          <option value="Copies">Copies</option>
          <option value="Sets">Sets</option>
          <option value="Pkt">Pkt</option>
          <option value="Sq Ft">Sq Ft</option>
          <option value="Day">Day</option>
          <option value="Hrs">Hrs</option>
          <option value="Roll">Roll</option>
          <option value="Job">Job</option>
        </select>
      </td>

      {/* List Price (Rs.) */}
      <td className="py-3 px-2 w-28">
        <div className="relative">
          <span className="absolute left-2 top-1.5 text-[10px] text-slate-500 font-mono">Rs.</span>
          <input
            type="number"
            min="0"
            step="any"
            value={item.listPrice}
            onChange={(e) => onUpdate(item.id, 'listPrice', parseFloat(e.target.value) || 0)}
            className="w-full bg-slate-900/80 border border-slate-700 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 rounded-lg pl-7 pr-2 py-1.5 text-xs text-right font-mono text-white"
          />
        </div>
      </td>

      {/* Discount (only if showDiscount is true) */}
      {showDiscount && (
        <td className="py-3 px-2 w-32">
          <div className="flex items-center space-x-1">
            <input
              type="number"
              min="0"
              step="any"
              value={item.discountValue}
              onChange={(e) => onUpdate(item.id, 'discountValue', parseFloat(e.target.value) || 0)}
              className="w-full bg-slate-900/80 border border-slate-700 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 rounded-lg px-2 py-1.5 text-xs text-right font-mono text-amber-400"
            />
            <button
              type="button"
              onClick={() => onUpdate(item.id, 'discountType', item.discountType === 'percent' ? 'flat' : 'percent')}
              className={`px-1.5 py-1 rounded border text-[10px] font-bold font-mono transition-colors ${
                item.discountType === 'percent'
                  ? 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                  : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
              }`}
              title={item.discountType === 'percent' ? 'Percentage Discount (%)' : 'Flat Discount (Rs.)'}
            >
              {item.discountType === 'percent' ? '%' : 'Rs'}
            </button>
          </div>
        </td>
      )}

      {/* Effective Price */}
      <td className="py-3 px-3 text-right text-xs font-mono text-slate-300 font-medium">
        {formatNPR(item.effectivePrice)}
      </td>

      {/* Amount (Rs.) */}
      <td className="py-3 px-3 text-right text-xs font-mono font-bold text-sky-400">
        {formatNPR(item.amount)}
      </td>

      {/* Delete Action */}
      <td className="py-3 px-2 text-center w-12">
        <button
          type="button"
          onClick={() => onRemove(item.id)}
          className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all opacity-70 group-hover:opacity-100"
          title="Remove Item"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </td>
    </tr>
  );
};
