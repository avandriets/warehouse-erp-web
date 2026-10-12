export interface ReferenceOption {
  id: string;
  code: string;
  name: string;
  active: boolean;
}

export interface ReferenceOptionsPage {
  items: ReferenceOption[];
  total: number;
}
