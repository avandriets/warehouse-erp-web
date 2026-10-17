import type { EntityDataPage } from '@warehouse/shared';

export interface CategoryCreate {
  code: string;
  name: string;
  description: string | null;
  parent_id: string | null;
}

export interface CategoryReference {
  id: string;
  code: string;
  name: string;
  active: boolean;
}

export interface Category extends CategoryCreate {
  parent?: CategoryReference | null;
  id: string;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CategoryUpdate {
  name?: string;
  description?: string | null;
  parent_id?: string | null;
  active?: boolean;
}

export interface CategoriesPage {
  ancestors?: CategoryReference[];
  items: Category[];
  total: number;
}

export interface CategoriesQuery {
  q?: string;
  active?: boolean;
  parent_id?: string;
  root_only?: boolean;
  exclude_subtree_id?: string;
  limit: number;
  offset: number;
}

export interface CategoryEntityPage extends EntityDataPage<Category> {
  ancestors?: CategoryReference[];
  parentId?: string | null;
}
