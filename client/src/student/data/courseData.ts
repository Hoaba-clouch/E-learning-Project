import type { Course, RecommendedCourse } from "../types/student.types";

export const courseImages = [
  "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1518005020951-eccb494ad742?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1553877522-43269d4ea984?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1498050108023-c5249f4df0852?auto=format&fit=crop&w=900&q=80",
];

export const courses: Course[] = [
  {
    title: "Advanced Architectural Systems in React",
    category: "Development",
    author: "Dr. Julian Vance",
    price: "$129.00",
    rating: "4.9",
    image: courseImages[0],
  },
  {
    title: "Editorial UI: Beyond Grid Systems",
    category: "Design",
    author: "Elena Rossi",
    price: "$89.00",
    rating: "4.8",
    image: courseImages[1],
  },
  {
    title: "Strategic Operations for Digital Agencies",
    category: "Business",
    author: "Marcus Thorne",
    price: "$199.00",
    rating: "4.7",
    image: courseImages[2],
  },
  {
    title: "Holistic Wellness for Creative Professionals",
    category: "Health",
    author: "Sarah Jenkins",
    price: "$75.00",
    rating: "5.0",
    image: courseImages[3],
  },
  {
    title: "Mindful Leadership: The Executive Journey",
    category: "Business",
    author: "Dr. Arthur Pendelton",
    price: "$249.00",
    rating: "4.9",
    image: courseImages[4],
  },
  {
    title: "Data Visualization as Narrative Art",
    category: "Development",
    author: "Maya Chen",
    price: "$115.00",
    rating: "4.6",
    image: courseImages[5],
  },
];

export const recommended: RecommendedCourse[] = [
  {
    title: "Advanced Cyber Security & Ethical Defense",
    category: "Technology",
    author: "Prof. Marcus Thorne",
    price: "$89.00",
    image: courseImages[0],
  },
  {
    title: "UX Architecture: The Science of Interaction",
    category: "Design",
    author: "Elena Vance",
    price: "$124.00",
    image:
      "https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=900&q=80",
  },
  {
    title: "Quantitative Market Dynamics & Forecasting",
    category: "Business",
    author: "Dr. Julian Gray",
    price: "$159.00",
    image: courseImages[2],
  },
];
