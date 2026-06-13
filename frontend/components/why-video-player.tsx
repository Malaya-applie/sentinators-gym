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
    <div className="mt-10 relative w-full">
      {isPlaying && canPlayVideo ? (
        <video
          src={videoSrc}
          poster={posterSrc}
          controls
          autoPlay
          playsInline
          className="w-full rounded-xl object-cover"
        />
      ) : (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={posterSrc}
            alt="Why Choose Us"
            className="w-full rounded-xl object-cover"
          />
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
        </>
      )}
    </div>
  );
}
