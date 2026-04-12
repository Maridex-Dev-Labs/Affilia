'use client';

import { useEffect, useState } from 'react';
import { CaretLeft, CaretRight } from '@phosphor-icons/react';

const slides = [
  {
    city: 'Nairobi',
    label: 'Upper Hill skyline at golden hour',
    file: 'Nairobi skyline P1000019.jpg',
  },
  {
    city: 'Nairobi',
    label: 'CBD skyline from Uhuru Park',
    file: 'Nairobi City Skyline.jpg',
  },
  {
    city: 'Nairobi',
    label: 'Modern skyline of Kenya’s capital',
    file: 'The modern skyline of Nairobi.jpg',
  },
  {
    city: 'Nairobi',
    label: 'Skyline from Upper Hill',
    file: 'Nairobi skyline P1000020.jpg',
  },
  {
    city: 'Mombasa',
    label: 'Fort Jesus and the old coastal core',
    file: 'Mombasa, Kenya - 51971862709.jpg',
  },
  {
    city: 'Mombasa',
    label: 'Historic stone town detail',
    file: 'Mombasa, Kenya - 51970586142.jpg',
  },
  {
    city: 'Kisumu',
    label: 'Lake Victoria shoreline at sunset',
    file: 'Kisumu, Kenya.jpg',
  },
  {
    city: 'Kisumu',
    label: 'Sunset over Kenya’s lake city',
    file: 'Kisumu.jpg',
  },
  {
    city: 'Lamu',
    label: 'Swahili architecture and island streets',
    file: 'Lamu, Kenya (54225998711).jpg',
  },
  {
    city: 'Lamu',
    label: 'Morning light across old town',
    file: 'Lamu, Kenya (54342187052).jpg',
  },
];

const getImageUrl = (file: string) =>
  `https://commons.wikimedia.org/wiki/Special:Redirect/file/${encodeURIComponent(file)}`;

export default function HeroSlideshow() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setIndex((i) => (i + 1) % slides.length);
    }, 6000);
    return () => clearInterval(timer);
  }, []);

  const previous = () => setIndex((i) => (i - 1 + slides.length) % slides.length);
  const next = () => setIndex((i) => (i + 1) % slides.length);

  return (
    <div className="absolute inset-0">
      {slides.map((slide, slideIndex) => (
        <div
          key={slide.file}
          className="absolute inset-0 bg-cover bg-center transition-opacity duration-1000"
          style={{
            backgroundImage: `url(${getImageUrl(slide.file)})`,
            opacity: slideIndex === index ? 1 : 0,
          }}
        />
      ))}

      <div className="absolute inset-0 bg-gradient-to-br from-black/80 via-black/45 to-green-900/35 animate-flag" />

      <div className="absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-black/80 to-transparent">
        <div className="max-w-6xl mx-auto px-6 pb-8 pt-16 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-white/70">Kenyan Cities</p>
            <div className="mt-2 flex items-center gap-3">
              <span className="inline-flex rounded-full border border-white/15 bg-black/20 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-white/80">
                {slides[index].city}
              </span>
              <p className="text-sm text-white/75">{slides[index].label}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              aria-label="Previous slide"
              className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/20 bg-black/30 text-white transition hover:bg-white/10"
              onClick={previous}
              type="button"
            >
              <CaretLeft size={18} weight="bold" />
            </button>
            <div className="flex items-center gap-2">
              {slides.map((slide, slideIndex) => (
                <button
                  key={slide.file}
                  aria-label={`Show ${slide.city} slide ${slideIndex + 1}`}
                  className={`h-2.5 rounded-full transition ${
                    slideIndex === index ? 'w-8 bg-white' : 'w-2.5 bg-white/35 hover:bg-white/60'
                  }`}
                  onClick={() => setIndex(slideIndex)}
                  type="button"
                />
              ))}
            </div>
            <button
              aria-label="Next slide"
              className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/20 bg-black/30 text-white transition hover:bg-white/10"
              onClick={next}
              type="button"
            >
              <CaretRight size={18} weight="bold" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
