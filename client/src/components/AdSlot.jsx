import { useEffect, useRef, useState } from 'react';

const ADSTERRA_KEY = 'f3f5d934039639a93006cf4a26126b91';
const ADSTERRA_SRC = `https://www.highrevenueformat.com/${ADSTERRA_KEY}/invoke.js`;

export default function AdSlot({
  format = 'infeed',
  slotId,
  className = '',
}) {
  const containerRef = useRef(null);
  const [adsEnabled, setAdsEnabled] = useState(false);
  const loaded = useRef(false);

  useEffect(() => {
    const isEnabled = import.meta.env.VITE_ADS_ENABLED === 'true';
    setAdsEnabled(isEnabled);
  }, []);

  useEffect(() => {
    if (!adsEnabled || loaded.current || !containerRef.current) return;
    loaded.current = true;

    // Create a container div for the ad
    const adContainer = document.createElement('div');
    adContainer.style.display = 'flex';
    adContainer.style.justifyContent = 'center';
    adContainer.style.alignItems = 'center';
    adContainer.style.width = '100%';
    adContainer.style.overflow = 'hidden';

    // Create the options script
    const optionsScript = document.createElement('script');
    optionsScript.type = 'text/javascript';
    optionsScript.text = `
      atOptions = {
        'key' : '${ADSTERRA_KEY}',
        'format' : 'iframe',
        'height' : 90,
        'width' : 728,
        'params' : {}
      };
    `;

    // Create the invoke script
    const invokeScript = document.createElement('script');
    invokeScript.type = 'text/javascript';
    invokeScript.src = ADSTERRA_SRC;
    invokeScript.async = true;

    adContainer.appendChild(optionsScript);
    adContainer.appendChild(invokeScript);
    containerRef.current.appendChild(adContainer);

    return () => {
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
    };
  }, [adsEnabled]);

  if (!adsEnabled) return null;

  return (
    <div
      ref={containerRef}
      className={`ad-slot ad-slot--${format} ${className}`}
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        width: '100%',
        maxWidth: '728px',
        minHeight: '90px',
        margin: '16px auto',
        overflow: 'hidden',
      }}
      data-slot-id={slotId}
      aria-hidden="true"
    />
  );
}
