import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  CalendarCheck,
  ChevronLeft,
  ChevronRight,
  Crown,
  Dumbbell,
  HelpCircle,
  NotebookPen,
  Newspaper,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import coachImage from "@/assets/coach-stopwatch-card.jpg";
import premiumImage from "@/assets/premium-membership-card.jpg";
import wodImage from "@/assets/hero-wod-card.jpg";
import founderPhoto from "@/assets/haris-falas-coach.png";
import toolsCardImage from "@/assets/tools-card.jpg";
import blogCardImage from "@/assets/blog-card.jpg";
import faqCardImage from "@/assets/faq-card.jpg";
import { Button } from "@/components/ui/button";
import { Carousel, CarouselContent, CarouselItem, type CarouselApi } from "@/components/ui/carousel";
import { cn } from "@/lib/utils";

type CarouselAction = {
  title: string;
  description: string;
  to: "/coach" | "/wod" | "/pricing";
  image: string;
  icon: LucideIcon;
};

type BelowCard = {
  label: string;
  title: string;
  description: string;
  to: "/tools" | "/blog" | "/faq" | "/founder-note";
  image?: string;
  icon: LucideIcon;
};

export function MobileHomeActions({ showPricing }: { showPricing: boolean }) {
  const [carouselApi, setCarouselApi] = useState<CarouselApi>();
  const [activeIndex, setActiveIndex] = useState(0);

  const carouselActions: CarouselAction[] = [
    {
      title: "Create your workout",
      description: "Get a personalized workout built for you",
      to: "/coach",
      image: coachImage,
      icon: Dumbbell,
    },
    {
      title: "Workout of the Day",
      description: "Follow today's complete training session",
      to: "/wod",
      image: wodImage,
      icon: CalendarCheck,
    },
    ...(showPricing
      ? [
          {
            title: "Premium membership",
            description: "See membership options and full access",
            to: "/pricing" as const,
            image: premiumImage,
            icon: Crown,
          },
        ]
      : []),
  ];

  const belowCards: BelowCard[] = [
    {
      label: "TOOLS",
      title: "Tools",
      description: "Calculators, timers and training trackers",
      to: "/tools",
      image: toolsCardImage,
      icon: Wrench,
    },
    {
      label: "READ",
      title: "Blog",
      description: "Training articles, tips and guides",
      to: "/blog",
      image: blogCardImage,
      icon: Newspaper,
    },
    {
      label: "HELP",
      title: "Frequently Asked Questions",
      description: "Answers about plans, training and access",
      to: "/faq",
      image: faqCardImage,
      icon: HelpCircle,
    },
    {
      label: "COACH",
      title: "A Note from the Founder",
      description: "Haris Falas — Sports Scientist & Founder",
      to: "/founder-note",
      image: founderPhoto,
      icon: NotebookPen,
    },
  ];

  useEffect(() => {
    if (!carouselApi) return;
    const updateSelected = () => setActiveIndex(carouselApi.selectedScrollSnap());
    updateSelected();
    carouselApi.on("select", updateSelected);
    carouselApi.on("reInit", updateSelected);
    return () => {
      carouselApi.off("select", updateSelected);
      carouselApi.off("reInit", updateSelected);
    };
  }, [carouselApi]);

  return (
    <div className="mt-5 sm:hidden">
      <div className="mb-4 flex items-center justify-center gap-4">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => carouselApi?.scrollPrev()}
          aria-label="Previous option"
          className="h-8 w-8 rounded-full bg-primary/10 text-primary hover:bg-primary/20"
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <p className="text-lg font-extrabold uppercase text-primary">Start training</p>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => carouselApi?.scrollNext()}
          aria-label="Next option"
          className="h-8 w-8 rounded-full bg-primary/10 text-primary hover:bg-primary/20"
        >
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>

      <Carousel className="w-full" opts={{ align: "center", loop: true }} setApi={setCarouselApi}>
        <CarouselContent className="-ml-3">
          {carouselActions.map((action, index) => {
            const Icon = action.icon;
            return (
              <CarouselItem key={action.to} className="basis-[75%] pl-3 sm:basis-[60%]">
                <Link
                  to={action.to}
                  className="flex flex-col overflow-hidden rounded-xl border-2 border-green-500/60 bg-card transition-all duration-300 hover:scale-[1.02] hover:border-green-500 hover:shadow-xl"
                >
                  <div className="relative aspect-[16/8] w-full shrink-0 overflow-hidden">
                    <img
                      src={action.image}
                      alt={action.title}
                      width={1280}
                      height={640}
                      loading={index === 0 ? "eager" : "lazy"}
                      fetchPriority={index === 0 ? "high" : "auto"}
                      decoding="async"
                      className="absolute inset-0 h-full w-full object-cover object-[center_top]"
                    />
                  </div>
                  <div className="flex flex-1 flex-col justify-center p-2 text-center">
                    <div className="mb-0.5 flex items-center justify-center gap-1.5">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10">
                        <Icon className="h-3 w-3 text-primary" />
                      </span>
                      <h2 className="whitespace-nowrap text-xs font-bold leading-tight text-foreground">
                        {action.title}
                      </h2>
                    </div>
                    <p className="line-clamp-2 text-[10px] leading-snug text-muted-foreground">
                      {action.description}
                    </p>
                    <span className="mt-0.5 flex items-center justify-center gap-1 text-[9px] font-medium text-primary">
                      Explore<ChevronRight className="h-2.5 w-2.5" />
                    </span>
                  </div>
                </Link>
              </CarouselItem>
            );
          })}
        </CarouselContent>
      </Carousel>

      <div className="mt-4 flex justify-center gap-2">
        {carouselActions.map((action, index) => (
          <Button
            key={action.to}
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => carouselApi?.scrollTo(index)}
            aria-label={`Go to ${action.title}`}
            className={cn(
              "h-2.5 rounded-full p-0 transition-all",
              activeIndex === index
                ? "w-2.5 scale-125 bg-primary hover:bg-primary"
                : "w-2.5 bg-primary/30 hover:bg-primary/50",
            )}
          />
        ))}
      </div>

      <div className="mt-6 flex flex-col gap-2.5">
        {belowCards.map((card) => {
          const Icon = card.icon;
          return (
            <Link
              key={card.to}
              to={card.to}
              className="flex h-[68px] items-center gap-3 overflow-hidden rounded-xl border-2 border-primary/60 bg-card p-1.5 transition-all duration-300 hover:border-primary hover:shadow-xl"
            >
              <div className="relative h-[52px] w-[58px] shrink-0 overflow-hidden rounded-lg bg-primary/10">
                {card.image ? (
                  <img
                    src={card.image}
                    alt={card.title}
                    width={144}
                    height={144}
                    loading="lazy"
                    decoding="async"
                    className="absolute inset-0 h-full w-full object-cover object-[center_top]"
                  />
                ) : (
                  <span className="absolute inset-0 flex items-center justify-center">
                    <Icon className="h-6 w-6 text-primary" strokeWidth={1.5} />
                  </span>
                )}
              </div>
              <div className="flex min-w-0 flex-1 flex-col justify-center">
                <span className="text-[9px] font-bold uppercase tracking-wide text-primary">
                  {card.label}
                </span>
                <h3 className="text-[13px] font-extrabold leading-tight text-foreground">
                  {card.title}
                </h3>
                <p className="line-clamp-1 text-[10px] leading-snug text-muted-foreground">
                  {card.description}
                </p>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
