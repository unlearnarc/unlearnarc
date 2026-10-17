import { useState } from 'react';
import { User } from 'lucide-react';

interface ProfileAvatarProps {
  src?: string;
  name?: string;
  className: string;
  iconSize?: number;
}

/** External profile images are optional; failed requests must not break the UI. */
export function ProfileAvatar({ src, name, className, iconSize = 16 }: ProfileAvatarProps) {
  const [failedSrc, setFailedSrc] = useState<string>();
  if (src && src !== failedSrc) {
    return <img src={src} alt={name ?? 'Profile'} className={className}
      crossOrigin="anonymous" referrerPolicy="no-referrer" onError={() => setFailedSrc(src)} />;
  }
  return <span role="img" aria-label={name ?? 'Profile'}
    className={`${className} bg-primary-500 inline-flex items-center justify-center`}>
    <User size={iconSize} className="text-white" aria-hidden="true" />
  </span>;
}
