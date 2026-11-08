import Icon from '../Icon';

export default function BrandLogo() {
  return (
    <div className="flex items-center gap-2.5" aria-label="SAFEpass">
      <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'var(--brand)' }}>
        <Icon name="shield" className="w-4 h-4 text-white" />
      </div>
      <span className="text-lg tracking-tight" style={{ fontFamily: 'Sora, Inter, sans-serif', fontWeight: 800, letterSpacing: '-0.07em', color: 'var(--brand-dark)' }}>
        SAFE<span style={{ color: 'var(--brand)' }}>pass</span>
      </span>
    </div>
  );
}
