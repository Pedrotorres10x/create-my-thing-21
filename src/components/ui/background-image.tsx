import { cn } from "@/lib/utils";

interface BackgroundImageProps {
  imageUrl: string;
  alt?: string;
  overlayOpacity?: number;
  overlayColor?: string;
  blur?: boolean;
  parallax?: boolean;
  className?: string;
  children?: React.ReactNode;
}

export const BackgroundImage = ({
  imageUrl,
  alt = "",
  overlayOpacity = 0.7,
  overlayColor = "hsl(222 47% 11%)",
  blur = false,
  parallax = false,
  className,
  children,
}: BackgroundImageProps) => {
  return (
    <div className={cn("relative w-full h-full overflow-hidden", className)}>
      {/* Background Image */}
      <div
        className={cn(
          "absolute inset-0 bg-cover bg-center bg-no-repeat transition-transform duration-700",
          parallax && "scale-110",
          blur && "blur-sm"
        )}
        style={{
          backgroundImage: `url(${imageUrl})`,
        }}
        role="img"
        aria-label={alt}
      />

      {/* Overlay Gradient */}
      <div
        className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-background/20"
        style={{
          backgroundColor: overlayColor,
          opacity: overlayOpacity,
        }}
      />

      {/* Content */}
      {children && (
        <div className="relative z-10 w-full h-full">
          {children}
        </div>
      )}
    </div>
  );
};
