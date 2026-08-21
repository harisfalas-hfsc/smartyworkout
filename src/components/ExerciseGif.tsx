import { ExerciseImage } from "@/components/ExerciseImage";

/** Kept for existing call sites — offline-first exercise picture. */
export function ExerciseGif({
  path,
  alt,
  className,
}: {
  path?: string | null;
  alt: string;
  className?: string;
}) {
  return <ExerciseImage path={path} alt={alt} className={className} />;
}
