type MaterialIconProps = {
  name: string;
  size?: number;
  filled?: boolean;
  className?: string;
};

export function MaterialIcon({
  name,
  size = 18,
  filled = false,
  className = "",
}: MaterialIconProps) {
  return (
    <span
      aria-hidden="true"
      className={`material-symbols-outlined ${className}`}
      style={{
        fontSize: size,
        fontVariationSettings: filled ? "'FILL' 1" : "'FILL' 0",
      }}
    >
      {name}
    </span>
  );
}
