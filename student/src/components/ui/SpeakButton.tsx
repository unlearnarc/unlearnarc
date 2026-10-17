/** Read-aloud is disabled. Preserve the public props for older content renderers. */
interface SpeakButtonProps {
  text: string;
  id: string;
  html?: boolean;
  label?: boolean;
  size?: number;
  className?: string;
}

export function SpeakButton(_props: SpeakButtonProps) {
  return null;
}
