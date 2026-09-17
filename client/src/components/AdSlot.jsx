import { useEffect, useRef, useState } from 'react';

// Format based on standard IAB sizes and responsive needs
const AD_FORMATS = {
  header: 'h-[90px] w-full max-w-[728px] md:h-[90px]',
  footer: 'h-[90px] w-full max-w-[970px]',
  sidebar: 'h-[250px] w-full max-w-[300px] sm:h-[600px]',
  infeed: 'h-[100px] w-full max-w-[970px] sm:h-[250px]',
  player: 'h-[250px] w-[300px]',
  mobileSticky: 'h-[50px] w-full max-w-[320px]',
  homeHero: 'h-[100px] w-full max-w-[1200px] sm:h-[120px]',
};

export default function AdSlot({ 
  format = 'infeed', 
  slotId, 
  className = '' 
}) {
  const [adsEnabled, setAdsEnabled] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    // Read directly from Vite env
    const isEnabled = import.meta.env.VITE_ADS_ENABLED === 'true';
    setAdsEnabled(isEnabled);

    // If ads are enabled and we had a real slotId, we would initialize AdSense here:
    // if (isEnabled && slotId && window.adsbygoogle) {
    //   window.adsbygoogle.push({});
    // }
  }, [slotId]);

  if (!adsEnabled) return null;

  const formatClass = AD_FORMATS[format] || AD_FORMATS.infeed;

  return (
    <div 
      className={`mx-auto flex items-center justify-center overflow-hidden rounded-xl border border-dashed border-white/20 bg-white/[0.02] text-zinc-500 ${formatClass} ${className}`}
      ref={containerRef}
      aria-hidden="true"
    >
      <div className="flex flex-col items-center justify-center p-4 text-center">
        <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-600">Advertisement</span>
        <span className="mt-1 hidden text-xs font-semibold sm:block">Responsive Ad Slot ({format})</span>
      </div>
    </div>
  );
}
