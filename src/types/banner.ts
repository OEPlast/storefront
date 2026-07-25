/**
 * Banner Types for Storefront
 * Represents active banners from the backend
 */

export type BannerCategory = 'A' | 'B' | 'C' | 'D' | 'E';

export interface ApiBanner {
  _id: string;
  name: string;
  active: boolean;
  imageUrl: string;
  pageLink: string;
  headerText?: string;
  mainText?: string;
  supportingText?: string | null;
  CTA?: string;
  ctaColor?: string;
  fullImage: boolean;
  category: BannerCategory;
  position: number;
  createdAt: string;
}

export interface GroupedBanners {
  A: ApiBanner[];
  B: ApiBanner[];
  C: ApiBanner[];
  D: ApiBanner[];
  E: ApiBanner[];
}
