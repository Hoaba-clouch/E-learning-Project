import Icon from "./Icon";

type DiscussionCardProps = {
  author: string;
  title: string;
  body: string;
  pinned?: boolean;
  reply?: boolean;
};

function DiscussionCard({
  author,
  title,
  body,
  pinned = false,
  reply = false,
}: DiscussionCardProps) {
  return (
    <article className={`sp-discussion-card${pinned ? " pinned" : ""}`}>
      <img src={`https://api.dicebear.com/9.x/personas/svg?seed=${author}`} alt="" />
      <div>
        <h3>
          {author} {pinned ? <span>Instructor</span> : null}
        </h3>
        <h2>{title}</h2>
        <p>{body}</p>
        {reply ? (
          <div className="sp-reply">
            <strong>Sarah Lopez</strong>
            <p>
              Try focusing on the typography scale first. Sometimes a very large
              display heading can act as the anchor point for all that empty space.
            </p>
          </div>
        ) : null}
        <footer>
          <button type="button">
            <Icon name="thumb_up" /> 42 Likes
          </button>
          <button type="button">
            <Icon name="chat_bubble" /> 18 Comments
          </button>
        </footer>
      </div>
      <small>{pinned ? "2 hours ago" : "Yesterday"}</small>
    </article>
  );
}

export default DiscussionCard;
