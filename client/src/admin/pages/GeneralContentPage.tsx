import { useTranslation } from "react-i18next";
import AdminDataState from "../components/AdminDataState";
import AdminSidebar from "../components/AdminSidebar";
import AdminTopbar from "../components/AdminTopbar";
import { useAdminData } from "../hooks/useAdminData";
import type { AdminPage } from "../adminNavigation";
import "../../index.css";

type GeneralContentPageProps = {
  activePage: AdminPage;
  onNavigate: (page: AdminPage) => void;
};

type ContentApiResponse = {
  success: boolean;
  data: {
    summary: { totalPosts: number; publishedPosts: number; draftPosts: number };
    posts: Array<{
      id: number;
      title: string;
      category: string;
      author: string;
      initials: string;
      status: string;
      statusLabel: string;
      publishedAt: string;
      thumbnail: string;
    }>;
    faqs: Array<{
      id: number;
      question: string;
      answer: string;
      expanded: boolean;
    }>;
    banners: Array<{
      id: number;
      title: string;
      subtitle: string;
      active: boolean;
      image: string;
    }>;
    insights: { monthlyReaders: number; growthRate: number };
  };
};

function GeneralContentPage({
  activePage,
  onNavigate,
}: GeneralContentPageProps) {
  const { t } = useTranslation("admin");
  const {
    data: pageData,
    error,
    isLoading,
  } = useAdminData<ContentApiResponse["data"]>("/general-content");

  if (!pageData) {
    return <AdminDataState error={error} isLoading={isLoading} />;
  }

  const displayedPosts =
    pageData.posts.map((post) => ({
      title: post.title,
      category: post.category,
      author: post.author,
      initials: post.initials,
      status: post.statusLabel,
      statusTone: post.status,
      date: new Date(post.publishedAt).toLocaleDateString("vi-VN"),
      image: post.thumbnail,
    }));
  const displayedFaqs =
    pageData.faqs.map((faq) => ({
      question: faq.question,
      answer: faq.answer,
      active: faq.expanded,
    }));
  const displayedBanners = pageData.banners;

  return (
    <div className="admin-shell">
      <AdminSidebar
        activePage={activePage}
        description={t("descriptions.content")}
        onNavigate={onNavigate}
      />

      <main className="main-panel">
        <AdminTopbar searchPlaceholder={t("search.content")} />

        <section className="content content-page">
          <div className="content-header">
            <div>
              <h1>Nội dung chung</h1>
              <p>
                Quản lý blog, câu hỏi thường gặp và hệ thống banner truyền thông
                cho toàn bộ nền tảng.
              </p>
            </div>

            <div className="content-header-actions">
              <button className="course-filter-btn" type="button">
                <span className="material-symbols-outlined">view_agenda</span>
                Xem trước trang
              </button>
              <button className="course-primary-btn" type="button">
                <span className="material-symbols-outlined">add</span>
                Tạo bài viết mới
              </button>
            </div>
          </div>

          <div className="content-grid">
            <section className="content-main">
              <div className="panel content-posts-card">
                <div className="content-section-head">
                  <div>
                    <h3>Bài viết gần đây</h3>
                  </div>
                  <div className="content-pills">
                    <span className="active">Tất cả ({pageData.summary.totalPosts})</span>
                    <span>Đã xuất bản ({pageData.summary.publishedPosts})</span>
                    <span>Bản nháp ({pageData.summary.draftPosts})</span>
                  </div>
                </div>

                <div className="content-post-list">
                  {displayedPosts.map((post) => (
                    <div key={post.title} className="content-post-row">
                      <div className="content-post-main">
                        <img src={post.image} alt={post.title} />
                        <div>
                          <strong>{post.title}</strong>
                          <p>{post.category}</p>
                        </div>
                      </div>

                      <div className="content-post-author">
                        <span>{post.initials}</span>
                        <small>{post.author}</small>
                      </div>

                      <div className={`content-post-status ${post.statusTone}`}>
                        <span className="dot" />
                        {post.status}
                      </div>

                      <div className="content-post-date">{post.date}</div>

                      <div className="content-post-actions">
                        <button type="button">
                          <span className="material-symbols-outlined">visibility</span>
                        </button>
                        <button type="button">
                          <span className="material-symbols-outlined">edit</span>
                        </button>
                        <button type="button">
                          <span className="material-symbols-outlined">delete</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="panel content-faq-card">
                <div className="content-section-head">
                  <div>
                    <h3>FAQ nền tảng</h3>
                    <p>Quản lý các câu hỏi phổ biến của học viên</p>
                  </div>
                  <button type="button" className="content-add-btn">
                    <span className="material-symbols-outlined">add</span>
                    Thêm FAQ
                  </button>
                </div>

                <div className="content-faq-list">
                  {displayedFaqs.map((item) => (
                    <div
                      key={item.question}
                      className={`content-faq-item${item.active ? " active" : ""}`}
                    >
                      <div className="content-faq-head">
                        <p>
                          <span className="material-symbols-outlined">
                            help_outline
                          </span>
                          {item.question}
                        </p>
                        <div className="content-faq-actions">
                          <button type="button">
                            <span className="material-symbols-outlined">edit</span>
                          </button>
                          <button type="button">
                            <span className="material-symbols-outlined">delete</span>
                          </button>
                          {!item.active ? (
                            <button type="button">
                              <span className="material-symbols-outlined">
                                expand_more
                              </span>
                            </button>
                          ) : null}
                        </div>
                      </div>
                      {item.active ? <small>{item.answer}</small> : null}
                    </div>
                  ))}
                </div>
              </div>
            </section>

            <aside className="content-side">
              <div className="panel content-banners-card">
                <h3>Banner quảng bá</h3>
                <div className="content-banner-list">
                  {displayedBanners.map((banner) => (
                    <div key={banner.title} className="content-banner-item">
                      <div className="content-banner-media">
                        <img src={banner.image} alt={banner.title} />
                        {!banner.active ? (
                          <div className="content-banner-overlay">Không hoạt động</div>
                        ) : null}
                        <button type="button">
                          <span className="material-symbols-outlined">edit</span>
                        </button>
                      </div>
                      <div className="content-banner-meta">
                        <div>
                          <strong>{banner.title}</strong>
                          <p>{banner.subtitle}</p>
                        </div>
                        <label className="system-switch compact">
                          <input type="checkbox" defaultChecked={banner.active} />
                          <span />
                        </label>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="panel content-editor-card">
                <div className="content-editor-head">
                  <span>Bản nháp xem trước</span>
                  <div>
                    <span className="material-symbols-outlined">format_bold</span>
                    <span className="material-symbols-outlined">format_italic</span>
                    <span className="material-symbols-outlined">link</span>
                  </div>
                </div>
                <div className="content-editor-body">
                  <h4>Sự trỗi dậy của Digital Nomads...</h4>
                  <div className="content-editor-line short" />
                  <div className="content-editor-line" />
                  <div className="content-editor-line medium" />
                  <div className="content-editor-actions">
                    <button type="button">Mở trình soạn thảo</button>
                    <button type="button">
                      <span className="material-symbols-outlined">fullscreen</span>
                    </button>
                  </div>
                </div>
              </div>

              <div className="content-insight-card">
                <p>Chỉ số tương tác</p>
                <h3>{`${(pageData.insights.monthlyReaders / 1000).toFixed(1)}k`}</h3>
                <span>Lượt đọc blog mỗi tháng</span>
                <div className="content-insight-track">
                  <div className="content-insight-fill" />
                </div>
                <small>+{pageData.insights.growthRate}% so với tháng trước</small>
              </div>
            </aside>
          </div>
        </section>
      </main>

      <button className="fab" type="button" aria-label="Tạo mới">
        <span className="material-symbols-outlined">add</span>
      </button>
    </div>
  );
}

export default GeneralContentPage;
