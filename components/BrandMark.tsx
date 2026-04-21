type Size = 'sm' | 'md' | 'lg';

const sizeClass: Record<Size, string> = {
  sm: 'text-xs',
  md: 'text-sm',
  lg: 'text-lg',
};

export default function BrandMark({ size = 'md' }: { size?: Size }) {
  return (
    <span className={`brand-word inline-flex items-baseline gap-[1px] ${sizeClass[size]}`}>
      <span className="text-[var(--ink)]">gatekeeper</span>
      <span className="text-[var(--amber)]">/</span>
      <span className="text-[var(--ink-dim)]">console</span>
    </span>
  );
}
