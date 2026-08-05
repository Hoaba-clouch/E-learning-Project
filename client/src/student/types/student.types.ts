export type StudentView =
  | "home"
  | "courses"
  | "myCourses"
  | "schedule"
  | "categories"
  | "cart"
  | "lesson"
  | "learning"
  | "courseDetail"
  | "exam"
  | "examTake"
  | "examReview"
  | "accountProfile"
  | "accountCertificates"
  | "accountPaymentHistory"
  | "interaction";

export type Course = {
  title: string;
  category: string;
  author: string;
  price: string;
  rating: string;
  image: string;
};

export type RecommendedCourse = Omit<Course, "rating">;

