import { useState } from 'react';

export function Avatar({ src, name, className = 'item-avatar' }) {
  const [failed, setFailed] = useState(false);
  const initial = (name || '?').trim().slice(0, 1).toUpperCase();

  return (
    <div className={className} aria-hidden="true">
      {src && !failed ? (
        <img
          src={src}
          alt=""
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          onError={() => setFailed(true)}
        />
      ) : (
        <span>{initial}</span>
      )}
    </div>
  );
}
