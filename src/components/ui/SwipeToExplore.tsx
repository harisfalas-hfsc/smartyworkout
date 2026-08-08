import { ChevronLeft, ChevronRight } from "lucide-react";

interface SwipeToExploreProps {
  onPrev: () => void;
  onNext: () => void;
}

export const SwipeToExplore = ({ onPrev, onNext }: SwipeToExploreProps) => {
  return (
    <div className="mb-4 flex items-center justify-center gap-3 text-muted-foreground">
      <button
        onClick={onPrev}
        className="p-1 transition-colors hover:text-primary active:scale-95"
        aria-label="Previous slide"
      >
        <ChevronLeft className="h-5 w-5" />
      </button>
      <span className="animate-pulse text-xs">Swipe to explore</span>
      <button
        onClick={onNext}
        className="p-1 transition-colors hover:text-primary active:scale-95"
        aria-label="Next slide"
      >
        <ChevronRight className="h-5 w-5" />
      </button>
    </div>
  );
};
