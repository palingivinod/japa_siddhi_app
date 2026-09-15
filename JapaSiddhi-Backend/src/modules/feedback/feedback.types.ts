export interface CreateFeedbackRequest {
  userId: number;
  rating: number;
  title: string;
  message: string;
  videoUrl?: string | null;
}

export interface FeedbackResponse {
  id: number;
  userId: number;
  rating: number;
  title: string;
  message: string;
  videoUrl?: string | null;
  createdAt: Date;
}
