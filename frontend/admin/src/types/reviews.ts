export interface GoogleReview {
  author_name: string;
  profile_photo_url: string;
  rating: number;
  relative_time_description: string;
  text: string;
}

/** Null when the Google Places integration isn't configured or the
 * upstream call failed - the homepage section simply doesn't render. */
export interface ReviewsSummary {
  rating: number;
  total: number;
  reviews: GoogleReview[];
  write_review_url: string;
  all_reviews_url: string;
}
