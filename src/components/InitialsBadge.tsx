interface InitialsBadgeProps {
  initials?: string;
  name?: string;
}

export default function InitialsBadge({ initials, name }: InitialsBadgeProps) {
  const label = initials?.trim() || '?';

  return (
    <span
      title={name || 'Unknown user'}
      className="inline-grid h-7 min-w-7 place-items-center rounded-full border border-line bg-paper px-2 text-[11px] font-semibold uppercase text-steel"
    >
      {label}
    </span>
  );
}
