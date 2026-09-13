import type { Category } from './types';

export interface CategoryGroup {
  parent: Category;
  children: Category[];
}

export function groupCategories(categories: Category[]): CategoryGroup[] {
  const childrenByParent = new Map<string, Category[]>();
  for (const category of categories) {
    if (!category.parentId) continue;
    const children = childrenByParent.get(category.parentId) ?? [];
    children.push(category);
    childrenByParent.set(category.parentId, children);
  }

  return categories
    .filter((category) => !category.parentId && childrenByParent.has(category.id))
    .map((parent) => ({
      parent,
      children: [...(childrenByParent.get(parent.id) ?? [])].sort((a, b) =>
        a.name.localeCompare(b.name, 'es'),
      ),
    }))
    .sort((a, b) => a.parent.name.localeCompare(b.parent.name, 'es'));
}

export function getCategoryParent(
  categoryId: string | null | undefined,
  categories: Category[],
): Category | undefined {
  const category = categories.find((candidate) => candidate.id === categoryId);
  if (!category) return undefined;
  if (!category.parentId) return category;
  return categories.find((candidate) => candidate.id === category.parentId);
}

export function getCategoryPath(
  categoryId: string | null | undefined,
  categories: Category[],
): string {
  const category = categories.find((candidate) => candidate.id === categoryId);
  if (!category) return 'Sin categoría';
  const parent = categories.find((candidate) => candidate.id === category.parentId);
  return parent ? `${parent.name} · ${category.name}` : category.name;
}

export function isLeafCategory(category: Category, categories: Category[]): boolean {
  return !categories.some((candidate) => candidate.parentId === category.id);
}
