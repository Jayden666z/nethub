import { ChevronDown } from 'lucide-react';

export function FaqSection({ title = '常见问题与选购指南', items }) {
  if (!items?.length) return null;

  return (
    <section className="faq-section" aria-label={title}>
      <div className="faq-header">
        <h2 className="faq-title">{title}</h2>
      </div>
      <div className="faq-list">
        {items.map((item, idx) => (
          <details key={idx} className="faq-item" open={idx === 0}>
            <summary className="faq-question">
              <span>{item.q}</span>
              <ChevronDown size={16} className="faq-chevron" aria-hidden="true" />
            </summary>
            <p className="faq-answer">{item.a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
