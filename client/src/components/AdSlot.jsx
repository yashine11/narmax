import { useEffect, useState } from 'react';

const ADSTERRA_KEY = 'f3f5d934039639a93006cf4a26126b91';
const ADSTERRA_SRC = `https://www.highrevenueformat.com/${ADSTERRA_KEY}/invoke.js`;

export default function AdSlot({
  format = 'infeed',
  slotId,
  className = '',
}) {
  const [adsEnabled, setAdsEnabled] = useState(false);

  useEffect(() => {
    const isEnabled = import.meta.env.VITE_ADS_ENABLED === 'true';
    setAdsEnabled(isEnabled);
  }, []);

  if (!adsEnabled) return null;

  // Adsterra unit is 728x90
  const adWidth = 728;
  const adHeight = 90;

  // Sandboxed HTML to run Adsterra in complete isolation
  // Note: We intentionally OMIT allow-top-navigation so the ad can NEVER redirect the user away from NARMAX!
  const iframeSrcDoc = `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <base target="_blank">
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      html, body {
        width: 100%;
        height: 100%;
        background: transparent;
        display: flex;
        justify-content: center;
        align-items: center;
        overflow: hidden;
      }
    </style>
  </head>
  <body>
    <script type="text/javascript">
      atOptions = {
        'key' : '${ADSTERRA_KEY}',
        'format' : 'iframe',
        'height' : ${adHeight},
        'width' : ${adWidth},
        'params' : {}
      };
    </script>
    <script type="text/javascript" src="${ADSTERRA_SRC}"></script>
  </body>
</html>`;

  return (
    <div
      className={`ad-slot ad-slot--${format} ${className}`}
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        width: '100%',
        maxWidth: `${adWidth}px`,
        minHeight: `${adHeight}px`,
        margin: '16px auto',
        overflow: 'hidden',
      }}
      data-slot-id={slotId}
      aria-hidden="true"
    >
      <iframe
        title={`ad-${slotId || format}`}
        srcDoc={iframeSrcDoc}
        width={adWidth}
        height={adHeight}
        sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox allow-forms"
        scrolling="no"
        style={{
          border: 'none',
          overflow: 'hidden',
          width: `${adWidth}px`,
          height: `${adHeight}px`,
          maxWidth: '100%',
        }}
      />
    </div>
  );
}
