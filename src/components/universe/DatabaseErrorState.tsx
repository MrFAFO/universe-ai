interface DatabaseErrorStateProps {
  title?: string;
  message?: string;
}

export function DatabaseErrorState({
  title = "Something went wrong",
  message = "Unable to load data right now. Please try again in a moment.",
}: DatabaseErrorStateProps) {
  return (
    <div className="database-error surface-card rounded-xl p-8 text-center">
      <h2 className="text-lg font-semibold text-text-primary">{title}</h2>
      <p className="mt-2 text-[15px] leading-relaxed text-text-secondary">
        {message}
      </p>
    </div>
  );
}
