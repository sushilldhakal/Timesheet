"use client"

import Image from "next/image"
import { cn } from "@/lib/utils"

/** Cloudinary URLs are proxied through /api/image for auth-protected access. */
function getImageSrc(src: string): string {
  if (src.startsWith("data:")) return src
  if (src.includes("res.cloudinary.com")) {
    return `/api/image?url=${encodeURIComponent(src)}`
  }
  return src
}

/** Use Next/Image for http(s) URLs (optimized, lazy), and native img for data URLs (e.g. file preview). */
export function OptimizedImage({
  src,
  alt,
  className,
  width,
  height,
  sizes,
  fill,
  priority,
}: {
  src: string
  alt: string
  className?: string
  width?: number
  height?: number
  sizes?: string
  fill?: boolean
  priority?: boolean
}) {
  const isDataUrl = src.startsWith("data:")
  const imageSrc = getImageSrc(src)
  const isProxied = src.includes("res.cloudinary.com")

  if (isDataUrl) {
    return (
      <img
        src={src}
        alt={alt}
        className={cn(className)}
        loading="lazy"
        decoding="async"
        width={width}
        height={height}
      />
    )
  }

  if (fill) {
    return (
      <Image
        src={imageSrc}
        alt={alt}
        className={cn(className)}
        fill
        sizes={sizes ?? "64px"}
        loading={priority ? "eager" : "lazy"}
        decoding="async"
        unoptimized={isProxied}
      />
    )
  }

  return (
    <Image
      src={imageSrc}
      alt={alt}
      className={cn(className)}
      width={width ?? 64}
      height={height ?? 64}
      sizes={sizes ?? "64px"}
      loading={priority ? "eager" : "lazy"}
      decoding="async"
      unoptimized={isProxied}
    />
  )
}
