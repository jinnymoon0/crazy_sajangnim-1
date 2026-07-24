"use client";

import {
  type TouchEvent,
  useRef,
  useState,
} from "react";

type BlogImageGalleryProps = {
  title: string;
  imageUrls: string[];
};

export default function BlogImageGallery({
  title,
  imageUrls,
}: BlogImageGalleryProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const touchStartXRef = useRef<number | null>(null);

  const [activeIndex, setActiveIndex] = useState(0);

  function goToImage(index: number) {
    const safeIndex = Math.max(
      0,
      Math.min(index, imageUrls.length - 1),
    );

    const container = containerRef.current;

    if (!container) {
      return;
    }

    container.scrollTo({
      left: container.clientWidth * safeIndex,
      behavior: "smooth",
    });

    setActiveIndex(safeIndex);
  }

  function handleScroll() {
    const container = containerRef.current;

    if (!container || container.clientWidth === 0) {
      return;
    }

    const nextIndex = Math.round(
      container.scrollLeft / container.clientWidth,
    );

    setActiveIndex(
      Math.max(0, Math.min(nextIndex, imageUrls.length - 1)),
    );
  }

  function handleTouchStart(event: TouchEvent<HTMLDivElement>) {
    touchStartXRef.current = event.touches[0]?.clientX ?? null;
  }

  function handleTouchEnd(event: TouchEvent<HTMLDivElement>) {
    const touchStartX = touchStartXRef.current;
    const touchEndX = event.changedTouches[0]?.clientX;

    touchStartXRef.current = null;

    if (touchStartX === null || touchEndX === undefined) {
      return;
    }

    const swipeDistance = touchStartX - touchEndX;
    const minimumSwipeDistance = 45;

    if (Math.abs(swipeDistance) < minimumSwipeDistance) {
      return;
    }

    if (swipeDistance > 0) {
      goToImage(activeIndex + 1);
    } else {
      goToImage(activeIndex - 1);
    }
  }

  if (imageUrls.length === 0) {
    return (
      <div className="flex aspect-[4/5] items-center justify-center rounded-3xl bg-neutral-100 text-sm text-neutral-500">
        Image unavailable
      </div>
    );
  }

  return (
    <section aria-label={`${title} image gallery`}>
      <div className="relative overflow-hidden rounded-3xl bg-neutral-100">
        <div
          ref={containerRef}
          onScroll={handleScroll}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          className="flex snap-x snap-mandatory overflow-x-auto scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {imageUrls.map((imageUrl, index) => (
            <div
              key={`${imageUrl}-${index}`}
              className="min-w-full snap-center"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imageUrl}
                alt={`${title} image ${index + 1}`}
                className="aspect-[4/5] w-full select-none object-contain"
                draggable={false}
              />
            </div>
          ))}
        </div>

        {imageUrls.length > 1 ? (
          <>
            <button
              type="button"
              onClick={() => goToImage(activeIndex - 1)}
              disabled={activeIndex === 0}
              aria-label="Previous image"
              className="absolute left-3 top-1/2 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-black/65 text-2xl text-white backdrop-blur transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-30 sm:inline-flex"
            >
              ‹
            </button>

            <button
              type="button"
              onClick={() => goToImage(activeIndex + 1)}
              disabled={activeIndex === imageUrls.length - 1}
              aria-label="Next image"
              className="absolute right-3 top-1/2 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-black/65 text-2xl text-white backdrop-blur transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-30 sm:inline-flex"
            >
              ›
            </button>

            <div className="absolute bottom-4 right-4 rounded-full bg-black/70 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur">
              {activeIndex + 1} / {imageUrls.length}
            </div>
          </>
        ) : null}
      </div>

      {imageUrls.length > 1 ? (
        <div className="mt-4 flex justify-center gap-2">
          {imageUrls.map((imageUrl, index) => (
            <button
              key={`${imageUrl}-indicator-${index}`}
              type="button"
              onClick={() => goToImage(index)}
              aria-label={`Go to image ${index + 1}`}
              aria-current={activeIndex === index}
              className={`h-2.5 rounded-full transition-all ${
                activeIndex === index
                  ? "w-7 bg-neutral-950"
                  : "w-2.5 bg-neutral-300 hover:bg-neutral-500"
              }`}
            />
          ))}
        </div>
      ) : null}

      {imageUrls.length > 1 ? (
        <p className="mt-3 text-center text-xs text-neutral-500 sm:hidden">
          Swipe left or right to view more images.
        </p>
      ) : null}
    </section>
  );
}
