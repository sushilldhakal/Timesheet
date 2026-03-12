"use client"

import Image from "next/image"
import { useState } from "react"
import { User } from "lucide-react"
import { cn } from "@/lib/utils/cn"

/** Cloudinary URLs are proxied through /api/image for auth-protected access. */
function getImageSrc(src: string): string {
  if (src.startsWith("data:")) return src
  if (src.includes("res.cloudinary.com")) {
    return `/api/image?url=${encodeURIComponent(src)}`
  }
  return src
}

/** Fallback avatar component */
function AvatarFallback({ 
  name, 
  className, 
  width = 64, 
  height = 64 
}: { 
  name?: string
  className?: string
  width?: number
  height?: number
}) {
  const initial = name?.charAt(0).toUpperCase() || "?"
  
  return (
    <div 
      className={cn(
        "flex items-center justify-center bg-muted text-muted-foreground",
        className
      )}
      style={{ width, height }}
    >
      {name ? (
        <span className="font-medium" style={{ fontSize: Math.min(width, height) * 0.4 }}>
          {initial}
        </span>
      ) : (
        <User className="w-1/2 h-1/2" />
      )}
    </div>
  )
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
  fallbackName,
}: {
  src: string
  alt: string
  className?: string
  width?: number
  height?: number
  sizes?: string
  fill?: boolean
  priority?: boolean
  fallbackName?: string
}) {
  const [hasError, setHasError] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  
  const isDataUrl = src.startsWith("data:")
  const imageSrc = getImageSrc(src)
  const isProxied = src.includes("res.cloudinary.com")

  // Show fallback if there's an error or no src
  if (hasError || !src || src.trim() === "") {
    if (fill) {
      return <AvatarFallback name={fallbackName} className={className} />
    }
    return (
      <AvatarFallback 
        name={fallbackName} 
        className={className} 
        width={width} 
        height={height} 
      />
    )
  }

  const handleError = () => {
    setHasError(true)
    setIsLoading(false)
  }

  const handleLoad = () => {
    setIsLoading(false)
  }

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
        onError={handleError}
        onLoad={handleLoad}
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
        onError={handleError}
        onLoad={handleLoad}
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
      onError={handleError}
      onLoad={handleLoad}
    />
  )
}