import { getCategoryParent, getCategoryPath, groupCategories, isLeafCategory } from '../categories';
import type { Category } from '../types';

const categories: Category[] = [
  { id: 'food', name: 'Alimentación', icon: 'restaurant', color: '#111' },
  { id: 'water', name: 'Agua', icon: 'water', color: '#111', parentId: 'food' },
  { id: 'lunch', name: 'Menú', icon: 'restaurant', color: '#111', parentId: 'food' },
  { id: 'unclassified', name: 'Por clasificar', icon: 'help', color: '#222' },
];

describe('categorías jerárquicas', () => {
  it('agrupa y ordena las subcategorías', () => {
    expect(groupCategories(categories)).toEqual([
      { parent: categories[0]!, children: [categories[1]!, categories[2]!] },
    ]);
  });

  it('resuelve familia y ruta legible', () => {
    expect(getCategoryParent('water', categories)?.id).toBe('food');
    expect(getCategoryPath('water', categories)).toBe('Alimentación · Agua');
    expect(getCategoryPath('missing', categories)).toBe('Sin categoría');
  });

  it('distingue familias de categorías seleccionables', () => {
    expect(isLeafCategory(categories[0]!, categories)).toBe(false);
    expect(isLeafCategory(categories[1]!, categories)).toBe(true);
    expect(isLeafCategory(categories[3]!, categories)).toBe(true);
  });
});
