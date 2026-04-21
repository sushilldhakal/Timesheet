// Allow R2 URLs (custom domains, r2.dev subdomains, and cloudflarestorage.com)
// Legacy Cloudinary support removed as we've migrated to R2
const ALLOWED_HOST_PATTERNS = [
  /\.r2\.dev$/,                    // R2 public subdomain: pub-{hash}.r2.dev
  /\.r2\.cloudflarestorage\.com$/, // R2 direct bucket URLs
];

function isAllowedUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return false;
    
    // Check if hostname matches any allowed pattern
    return ALLOWED_HOST_PATTERNS.some((pattern) => pattern.test(parsed.hostname));
  } catch {
    return false;
  }
}

export class ImageProxyService {
  async proxyImage(urlParam: string | null) {
    if (!urlParam) return { status: 400, json: { error: "URL parameter is required" } as const };

    const decoded = decodeURIComponent(urlParam);
    if (!isAllowedUrl(decoded)) return { status: 400, json: { error: "Invalid image URL" } as const };

    const res = await fetch(decoded, { headers: { Accept: "image/*" }, next: { revalidate: 3600 } });
    if (!res.ok) return { status: 404, json: { error: "Image not found" } as const };

    const contentType = res.headers.get("content-type") ?? "image/jpeg";
    if (!contentType.startsWith("image/")) return { status: 400, json: { error: "Invalid image format" } as const };

    const blob = await res.blob();
    return { status: 200, blob, contentType };
  }
}

export const imageProxyService = new ImageProxyService();

