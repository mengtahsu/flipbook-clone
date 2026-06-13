/** A labeled region on the image (for click accuracy) */
export interface ImageRegion {
  label: string;       // e.g. "Ubud town center"
  description: string; // e.g. "Cultural heart of Bali with art markets"
  x: number;           // center x % (0-100)
  y: number;           // center y % (0-100)
}

/** A single page in the exploration history */
export interface PageData {
  query: string;
  imageUrl: string;
  imageCredit: {
    name: string;
    url: string;
  };
  title: string;
  description: string;
  subtopics: string[];
  /** Spatial regions in this image (for accurate click mapping) */
  regions?: ImageRegion[];
}

export interface SearchRequest {
  query: string;
  breadcrumbs: string[];
  depth: number;
}

export interface SearchResponse extends PageData {}

export interface ClickRequest {
  x: number;
  y: number;
  imageWidth: number;
  imageHeight: number;
  currentTitle: string;
  currentDescription: string;
  breadcrumbs: string[];
  depth: number;
  /** Known regions in the current image */
  regions?: ImageRegion[];
}

export interface ClickResponse {
  subQuery: string;
}

/** The full exploration state kept in the frontend */
export interface ExplorationState {
  pages: PageData[];
  currentDepth: number;
  isLoading: boolean;
  error: string | null;
  maxDepth: number;
}
