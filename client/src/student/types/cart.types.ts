export type StudentCartItem = {
  id: number;
  priceSnapshot: number;
  addedAt: string;
  batch: {
    id: number;
    code: string | null;
    name: string;
    startDate: string;
    endDate: string;
    status: string;
    tuitionFee: number | null;
  };
  course: {
    id: number;
    name: string;
    description: string | null;
    thumbnailUrl: string | null;
    level: string;
    price: number;
  };
  category: {
    id: number;
    name: string;
  };
  teacher: {
    id: number;
    fullName: string;
    email: string;
    avatarUrl: string | null;
  };
};

export type StudentCart = {
  id: number;
  status: "ACTIVE";
  items: StudentCartItem[];
  summary: {
    itemCount: number;
    subtotal: number;
    discount: number;
    tax: number;
    total: number;
  };
};
