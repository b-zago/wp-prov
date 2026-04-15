import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function Svg({ size = 16, ...rest }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.4}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...rest}
    />
  );
}

export const GridIcon = (p: IconProps) => (
  <Svg {...p}>
    <rect x="1.5" y="1.5" width="5.5" height="5.5" rx="1.3" />
    <rect x="9" y="1.5" width="5.5" height="5.5" rx="1.3" />
    <rect x="1.5" y="9" width="5.5" height="5.5" rx="1.3" />
    <rect x="9" y="9" width="5.5" height="5.5" rx="1.3" />
  </Svg>
);

export const PlusIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M8 2.5v11M2.5 8h11" />
  </Svg>
);

export const RefreshIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M13.5 8A5.5 5.5 0 1 1 8 2.5a5.48 5.48 0 0 1 3.89 1.61L13.5 2.5" />
    <path d="M13.5 2.5V6H10" />
  </Svg>
);

export const TrashIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M2 4h12M5.5 4V2.75a.75.75 0 0 1 .75-.75h3.5a.75.75 0 0 1 .75.75V4M12 4l-.6 8.1a1 1 0 0 1-1 .9H5.6a1 1 0 0 1-1-.9L4 4" />
  </Svg>
);

export const SpinnerIcon = (p: IconProps) => (
  <Svg {...p} className={`spinner ${p.className ?? ""}`.trim()}>
    <circle cx="8" cy="8" r="5.5" strokeDasharray="28" strokeDashoffset="10" />
  </Svg>
);

export const ExternalIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M9 3.5h3.5V7" />
    <path d="M12.5 3.5 8 8" />
    <path d="M12.5 9.5V12a1 1 0 0 1-1 1h-8a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1H6" />
  </Svg>
);
