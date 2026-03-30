export interface EditionConfig {
  id: string;
  name: string;
  dataVersion: string;
  releaseDate: string;
  isActive: boolean;
}

export const EDITIONS: EditionConfig[] = [
  { id: '10th', name: '10th Edition', dataVersion: '1.0.0', releaseDate: '2023-06-01', isActive: true },
  { id: '11th', name: '11th Edition', dataVersion: '0.0.0', releaseDate: '2026-06-01', isActive: false },
];

export function getActiveEdition(): EditionConfig {
  return EDITIONS.find(e => e.isActive) ?? EDITIONS[0];
}

export function isEditionDataAvailable(editionId: string): boolean {
  const edition = EDITIONS.find(e => e.id === editionId);
  return edition ? edition.dataVersion !== '0.0.0' : false;
}
