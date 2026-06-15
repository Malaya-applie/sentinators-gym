"use client";

import { useState } from "react";

type WhyVideoPlayerProps = {
  posterSrc: string;
  videoSrc?: string;
};

export function WhyVideoPlayer({ posterSrc, videoSrc }: WhyVideoPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const canPlayVideo = Boolean(videoSrc);

  return (
    <div className="mt-10 w-full">
      <div className="relative w-full overflow-hidden rounded-xl aspect-4/3 sm:aspect-video lg:aspect-21/9">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={posterSrc}
          alt="Why Choose Us"
          className="absolute inset-0 h-full w-full object-cover"
        />

        {isPlaying && canPlayVideo ? (
          <video
            src={videoSrc}
            poster={posterSrc}
            controls
            autoPlay
            playsInline
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : (
          <button
            type="button"
            onClick={() => canPlayVideo && setIsPlaying(true)}
            disabled={!canPlayVideo}
            aria-label="Play video"
            className="absolute top-1/2 left-1/2 z-10 -translate-x-1/2 -translate-y-1/2 disabled:cursor-not-allowed"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/play-icon.png"
              alt="Play Icon"
              className={`w-16 h-16 ${canPlayVideo ? "cursor-pointer" : "opacity-60"}`}
            />
          </button>
        )}
      </div>
    </div>
  );
}
