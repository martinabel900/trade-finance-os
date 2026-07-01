export default function PageHeader({ title, description, action }) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-2xl font-semibold tracking-normal text-ink">{title}</h1>
        {description ? <p className="mt-1 max-w-2xl text-sm text-steel">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}
