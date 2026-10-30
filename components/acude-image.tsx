export function AcudeImage({
  src,
  name,
  className = "",
}: {
  src: string | null;
  name: string;
  className?: string;
}) {
  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={`Imagen de ${name}`}
        loading="lazy"
        className={`object-cover ${className}`}
      />
    );
  }

  return (
    <div
      aria-hidden
      className={`flex items-center justify-center bg-teal-50 text-2xl font-black text-teal-800 ${className}`}
    >
      {name.charAt(0).toUpperCase()}
    </div>
  );
}
