const contentState = {
  posts: [
    {
      id: 1,
      title: "Tương lai của học tập thích ứng",
      category: "Công nghệ giáo dục",
      author: "Jane Doe",
      initials: "JD",
      status: "published",
      statusLabel: "Đã xuất bản",
      publishedAt: "2023-10-24",
      thumbnail:
        "https://images.unsplash.com/photo-1497633762265-9d179a990aa6?auto=format&fit=crop&w=400&q=80",
    },
    {
      id: 2,
      title: "Thiết kế thói quen học tập bền vững",
      category: "Phát triển cá nhân",
      author: "Mark Smith",
      initials: "MS",
      status: "draft",
      statusLabel: "Bản nháp",
      publishedAt: "2023-11-12",
      thumbnail:
        "https://images.unsplash.com/photo-1455390582262-044cdead277a?auto=format&fit=crop&w=400&q=80",
    },
  ],
  faqs: [
    {
      id: 1,
      question: "Làm thế nào để yêu cầu hoàn tiền cho khóa học?",
      answer:
        "Học viên có thể gửi yêu cầu hoàn tiền trong vòng 30 ngày nếu hoàn thành dưới 20% nội dung. Yêu cầu sẽ được xử lý tại khu vực thanh toán.",
      expanded: true,
    },
    {
      id: 2,
      question: "Có thể tải video về để xem ngoại tuyến không?",
      answer: "",
      expanded: false,
    },
  ],
  banners: [
    {
      id: 1,
      title: "Khuyến mãi mùa hè 2024",
      subtitle: "Kết thúc sau 12 ngày",
      active: true,
      image:
        "https://images.unsplash.com/photo-1557682250-33bd709cbe85?auto=format&fit=crop&w=500&q=80",
    },
    {
      id: 2,
      title: "Học bổng cuối năm",
      subtitle: "Lên lịch ngày 01/12",
      active: false,
      image:
        "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=500&q=80",
    },
  ],
  editorPreview: {
    title: "Sự trỗi dậy của Digital Nomads...",
  },
  insights: {
    monthlyReaders: 12400,
    growthRate: 14,
  },
};

export async function getAdminGeneralContentData() {
  return {
    summary: {
      totalPosts: contentState.posts.length,
      publishedPosts: contentState.posts.filter((post) => post.status === "published").length,
      draftPosts: contentState.posts.filter((post) => post.status === "draft").length,
    },
    ...contentState,
  };
}

export async function updateAdminFaq(faqId, payload) {
  const faq = contentState.faqs.find((item) => item.id === Number(faqId));

  if (!faq) {
    return null;
  }

  Object.assign(faq, payload);
  return faq;
}

export async function deleteAdminFaq(faqId) {
  const index = contentState.faqs.findIndex((item) => item.id === Number(faqId));

  if (index === -1) {
    return false;
  }

  contentState.faqs.splice(index, 1);
  return true;
}

export async function updateAdminBanner(bannerId, payload) {
  const banner = contentState.banners.find((item) => item.id === Number(bannerId));

  if (!banner) {
    return null;
  }

  Object.assign(banner, payload);
  return banner;
}
