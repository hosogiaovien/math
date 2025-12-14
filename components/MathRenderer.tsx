import React, { useEffect, useRef, memo } from 'react';

interface MathRendererProps {
  content: string;
  className?: string;
  inline?: boolean;
}

declare global {
  interface Window {
    MathJax: any;
  }
}

// Dùng memo để ngăn React render lại component này trừ khi content thực sự thay đổi.
// Điều này cực kỳ quan trọng vì MathJax biến đổi DOM trực tiếp. 
// Nếu React render lại, nó sẽ ghi đè DOM của MathJax bằng text gốc => mất định dạng.
export const MathRenderer = memo<MathRendererProps>(({ content, className = '', inline = false }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current && window.MathJax) {
      // 1. Đặt nội dung gốc vào container
      containerRef.current.innerHTML = content;
      
      // 2. Yêu cầu MathJax render lại (Typeset) thành SVG/HTML đẹp
      // Sử dụng typesetPromise để đảm bảo bất đồng bộ
      window.MathJax.typesetPromise([containerRef.current])
        .then(() => {
           // Có thể thêm logic sau khi render xong nếu cần
        })
        .catch((err: any) => {
          // Xóa lỗi typeset cũ nếu có để tránh kẹt
          window.MathJax.typesetClear([containerRef.current]);
          console.warn('MathJax typeset warning: ', err);
        });
    }
  }, [content]);

  const Tag = inline ? 'span' : 'div';

  return (
    <Tag 
      ref={containerRef} 
      className={`math-content ${className}`}
      // Render text gốc trước, sau đó useEffect sẽ chạy MathJax đè lên
      dangerouslySetInnerHTML={{ __html: content }} 
    />
  );
}, (prevProps, nextProps) => {
  // Custom comparison function for memo
  // Chỉ render lại khi nội dung text thay đổi hoặc kiểu inline thay đổi
  return prevProps.content === nextProps.content && prevProps.inline === nextProps.inline;
});