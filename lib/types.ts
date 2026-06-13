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
  /** Base64 JPEG crop around the click point (for vision LLM) */
  imageCrop?: string | null;
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
