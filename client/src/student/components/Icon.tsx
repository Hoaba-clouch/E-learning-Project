type IconProps = {
  name: string;
};

function Icon({ name }: IconProps) {
  return <span className="material-symbols-outlined">{name}</span>;
}

export default Icon;
