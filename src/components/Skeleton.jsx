export default function Skeleton({ lines = 3, className = "" }) {
  return (
    <div aria-busy="true" aria-label="Loading" className={className}>
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className="sv-skeleton mb-2 last:mb-0"
        />
      ))}
    </div>
  );
}
