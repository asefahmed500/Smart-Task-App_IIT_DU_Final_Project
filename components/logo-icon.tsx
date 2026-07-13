interface LogoIconProps {
  size?: number
  className?: string
}

export function LogoIcon({ size = 32, className }: LogoIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <rect width="32" height="32" rx="8" fill="#2C67F2" />
      <rect x="7" y="7" width="7" height="18" rx="2" fill="white" fillOpacity="0.95" />
      <rect x="18" y="12" width="7" height="13" rx="2" fill="white" fillOpacity="0.65" />
    </svg>
  )
}

export function LogoMark({ size = 16, className }: LogoIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <rect width="16" height="16" rx="4" fill="#2C67F2" />
      <rect x="3.5" y="3.5" width="3.5" height="9" rx="1" fill="white" fillOpacity="0.95" />
      <rect x="9" y="6" width="3.5" height="6.5" rx="1" fill="white" fillOpacity="0.65" />
    </svg>
  )
}
