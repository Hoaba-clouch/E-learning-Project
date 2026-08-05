type FilterGroupProps = {
  title: string;
  items: string[];
  checkedIndex: number;
  radio?: boolean;
};

function FilterGroup({
  title,
  items,
  checkedIndex,
  radio = false,
}: FilterGroupProps) {
  return (
    <div className="sp-filter-group">
      <h3>{title}</h3>
      {items.map((item, index) => (
        <label key={item}>
          <input
            type={radio ? "radio" : "checkbox"}
            defaultChecked={index === checkedIndex}
            name={title}
          />
          <span>{item}</span>
        </label>
      ))}
    </div>
  );
}

export default FilterGroup;
