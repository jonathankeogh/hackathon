/** Screen-reader (and test) marker that this phone has joined as `name`. */
export function JoinedAs({ name }: { name: string }) {
  return (
    <span className="ds-sr-only" data-testid="joined-as">
      You're in, {name}
    </span>
  );
}
