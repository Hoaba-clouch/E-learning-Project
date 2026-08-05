type WishlistItemProps = {
  title: string;
  price: string;
  image: string;
};

function WishlistItem({ title, price, image }: WishlistItemProps) {
  return (
    <article>
      <img src={image} alt={title} />
      <div>
        <h3>{title}</h3>
        <strong>{price}</strong>
        <button type="button">Thêm vào giỏ hàng</button>
      </div>
    </article>
  );
}

export default WishlistItem;
